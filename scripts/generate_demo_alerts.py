#!/usr/bin/env python3
"""
Generate diverse security alerts for Alert Investigation Pipeline demo.

Usage:
    python3 scripts/generate_demo_alerts.py [count] [--ingest]

    count:    Number of alerts to generate (default: 500)
    --ingest: Bulk-index into ES at localhost:9200 (otherwise prints stats)
    --cleanup: Delete existing demo alerts first

Each alert gets a unique combination of host/user/process/destination
to ensure realistic dedup grouping (not all clustered into 1).
"""

import json
import random
import hashlib
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from base64 import b64encode

ES_URL = "http://localhost:9200"
ES_AUTH = "elastic:changeme"
ALERTS_INDEX = ".alerts-security.alerts-default"

# ── Attack scenarios with distinct characteristics ──

SCENARIOS = [
    {
        "name": "Lateral Movement Campaign",
        "rules": [
            {"name": "Lateral Movement via Remote Services", "severity": "critical", "risk": 91},
            {"name": "Suspicious Remote Desktop Connection", "severity": "high", "risk": 78},
            {"name": "PsExec Activity Detected", "severity": "critical", "risk": 85},
        ],
        "processes": ["psexec.exe", "wmic.exe", "mstsc.exe", "winrm.cmd", "smbclient"],
        "dest_domains": ["dc01.corp.local", "dc02.corp.local", "fs01.corp.local", "exchange.corp.local"],
        "dest_ips": ["10.0.0.1", "10.0.0.2", "10.0.0.50", "10.0.0.51"],
        "actions": ["connection_attempted", "remote_execution", "smb_share_access"],
        "categories": ["lateral-movement"],
    },
    {
        "name": "Ransomware Attack",
        "rules": [
            {"name": "Ransomware Behavior Detected", "severity": "critical", "risk": 99},
            {"name": "Mass File Encryption Detected", "severity": "critical", "risk": 97},
            {"name": "Volume Shadow Copy Deletion", "severity": "critical", "risk": 95},
        ],
        "processes": ["cryptor.exe", "lockbit.exe", "vssadmin.exe", "bcdedit.exe", "wbadmin.exe"],
        "dest_domains": ["malware-drop.net", "ransom-c2.evil.com", "payment.darkweb.onion"],
        "dest_ips": ["203.0.113.50", "203.0.113.51", "198.51.100.99"],
        "actions": ["file_modified", "file_encrypted", "shadow_copy_deleted"],
        "categories": ["ransomware"],
    },
    {
        "name": "Credential Theft",
        "rules": [
            {"name": "Credential Dumping Detected", "severity": "critical", "risk": 88},
            {"name": "LSASS Memory Access", "severity": "critical", "risk": 90},
            {"name": "Kerberoasting Activity", "severity": "high", "risk": 82},
        ],
        "processes": ["mimikatz.exe", "procdump.exe", "rubeus.exe", "secretsdump.py", "hashcat.exe"],
        "dest_domains": ["dc01.corp.local", "krbtgt.corp.local"],
        "dest_ips": ["10.0.0.1", "10.0.0.2"],
        "actions": ["process_started", "memory_access", "credential_access"],
        "categories": ["credential-access"],
    },
    {
        "name": "Data Exfiltration",
        "rules": [
            {"name": "Data Exfiltration via DNS", "severity": "critical", "risk": 95},
            {"name": "Large Data Transfer to External Host", "severity": "high", "risk": 80},
            {"name": "Suspicious Cloud Storage Upload", "severity": "high", "risk": 76},
        ],
        "processes": ["dns_tunnel.exe", "rclone.exe", "curl", "wget", "azcopy.exe"],
        "dest_domains": ["exfil.evil.com", "tunnel.evil.com", "storage.evil-cloud.com", "paste.evil.com"],
        "dest_ips": ["198.51.100.25", "198.51.100.26", "104.248.10.5"],
        "actions": ["dns_query", "data_upload", "large_transfer"],
        "categories": ["exfiltration"],
    },
    {
        "name": "Phishing Campaign",
        "rules": [
            {"name": "Phishing Email with Malicious Attachment", "severity": "medium", "risk": 52},
            {"name": "Suspicious Email Link Clicked", "severity": "medium", "risk": 55},
            {"name": "Macro-Enabled Document Opened", "severity": "high", "risk": 72},
        ],
        "processes": ["outlook.exe", "winword.exe", "excel.exe", "chrome.exe", "msedge.exe"],
        "dest_domains": ["evil-phishing.com", "fake-login.com", "credential-harvest.net", "invoice-scam.com"],
        "dest_ips": ["45.33.32.156", "45.33.32.157", "45.33.32.158"],
        "actions": ["email_received", "link_clicked", "macro_executed"],
        "categories": ["initial-access"],
    },
    {
        "name": "Brute Force Attack",
        "rules": [
            {"name": "Brute Force Login Attempts", "severity": "high", "risk": 82},
            {"name": "Password Spray Detected", "severity": "high", "risk": 78},
            {"name": "Multiple Failed SSH Logins", "severity": "medium", "risk": 65},
        ],
        "processes": ["sshd", "login", "winlogon.exe", "sshd.exe"],
        "dest_domains": ["scanner.evil.com", "bruteforce.evil.com", "tor-exit.evil.com"],
        "dest_ips": ["185.220.101.42", "185.220.101.43", "185.220.101.44", "23.129.64.100"],
        "actions": ["authentication_failure", "password_spray", "ssh_brute_force"],
        "categories": ["credential-access"],
    },
    {
        "name": "Malware Infection",
        "rules": [
            {"name": "Malware Prevention Alert", "severity": "high", "risk": 73},
            {"name": "Suspicious DLL Side-Loading", "severity": "high", "risk": 77},
            {"name": "Cobalt Strike Beacon Detected", "severity": "critical", "risk": 93},
        ],
        "processes": ["suspicious.exe", "beacon.exe", "payload.dll", "dropper.exe", "loader.exe"],
        "dest_domains": ["c2-server.evil.com", "beacon.evil.com", "stage2.evil.com", "implant.evil.com"],
        "dest_ips": ["185.220.101.42", "104.248.10.1", "159.65.140.1"],
        "actions": ["file_created", "process_started", "dll_loaded"],
        "categories": ["malware"],
    },
    {
        "name": "Privilege Escalation",
        "rules": [
            {"name": "Unauthorized Access to Sensitive Files", "severity": "high", "risk": 70},
            {"name": "Suspicious Scheduled Task Created", "severity": "high", "risk": 75},
            {"name": "UAC Bypass Detected", "severity": "critical", "risk": 86},
        ],
        "processes": ["schtasks.exe", "at.exe", "reg.exe", "fodhelper.exe", "eventvwr.exe"],
        "dest_domains": ["dc01.corp.local", "admin-share.corp.local"],
        "dest_ips": ["10.0.0.1", "10.0.0.50"],
        "actions": ["privilege_escalation", "scheduled_task_created", "registry_modified"],
        "categories": ["privilege-escalation"],
    },
]

# ── Hosts: 15 distinct hosts across different segments ──
HOSTS = [
    {"name": "SRVWIN01", "ip": "10.0.1.50", "os": "Windows Server 2022"},
    {"name": "SRVWIN02", "ip": "10.0.1.51", "os": "Windows Server 2022"},
    {"name": "SRVWIN03", "ip": "10.0.1.52", "os": "Windows Server 2019"},
    {"name": "SRVDB01", "ip": "10.0.2.100", "os": "Windows Server 2022"},
    {"name": "SRVDB02", "ip": "10.0.2.101", "os": "Windows Server 2019"},
    {"name": "MAIL-GW01", "ip": "10.0.0.10", "os": "Linux"},
    {"name": "MAIL-GW02", "ip": "10.0.0.11", "os": "Linux"},
    {"name": "DC01", "ip": "10.0.0.1", "os": "Windows Server 2022"},
    {"name": "DC02", "ip": "10.0.0.2", "os": "Windows Server 2022"},
    {"name": "WEB01", "ip": "10.0.3.10", "os": "Linux"},
    {"name": "WEB02", "ip": "10.0.3.11", "os": "Linux"},
    {"name": "DEV-WS01", "ip": "192.168.1.100", "os": "macOS"},
    {"name": "DEV-WS02", "ip": "192.168.1.101", "os": "Windows 11"},
    {"name": "JUMP01", "ip": "10.0.0.20", "os": "Linux"},
    {"name": "BACKUP01", "ip": "10.0.4.10", "os": "Windows Server 2019"},
]

# ── Users: 12 distinct users ──
USERS = [
    "admin", "james", "sarah", "SYSTEM", "administrator",
    "john.doe", "mike.chen", "root", "svc-backup", "lisa.park",
    "dev-ci", "tom.wilson",
]


def generate_alerts(count: int, seed: int = 42) -> list:
    """Generate diverse alerts that form distinct entity groups."""
    random.seed(seed)
    alerts = []
    now = datetime.now(timezone.utc)

    # Pre-assign host/user pairs to scenarios to ensure distinct groups
    # Each scenario gets 1-3 host/user pairs
    host_user_pairs = []
    for host in HOSTS:
        for user in random.sample(USERS, min(3, len(USERS))):
            host_user_pairs.append((host, user))
    random.shuffle(host_user_pairs)

    # Assign pairs to scenarios round-robin
    scenario_pairs: dict[int, list] = {i: [] for i in range(len(SCENARIOS))}
    for i, pair in enumerate(host_user_pairs):
        scenario_idx = i % len(SCENARIOS)
        scenario_pairs[scenario_idx].append(pair)

    # Build a deterministic mapping: each host/user pair → exactly one scenario
    # This ensures alerts on the same host+user always share the same scenario,
    # and different host+user pairs use different scenarios — maximizing diversity
    # for the dedup algorithm (which groups by ruleName::hostName).
    pair_to_scenario: dict[tuple, int] = {}
    all_pairs = []
    for scenario_idx, pairs in scenario_pairs.items():
        for pair in pairs:
            pair_to_scenario[(pair[0]["name"], pair[1])] = scenario_idx
            all_pairs.append(pair)

    # Generate alerts
    for i in range(count):
        # Pick a random host/user pair, then use its assigned scenario
        host, user = random.choice(all_pairs)
        scenario_idx = pair_to_scenario[(host["name"], user)]
        scenario = SCENARIOS[scenario_idx]
        rule = random.choice(scenario["rules"])
        process = random.choice(scenario["processes"])
        dest_domain = random.choice(scenario["dest_domains"])
        dest_ip = random.choice(scenario["dest_ips"])
        action = random.choice(scenario["actions"])

        # Time spread: alerts within the last 30 minutes
        offset_seconds = random.randint(0, 1800)
        ts = now - timedelta(seconds=offset_seconds)

        # Unique file hash per alert (prevents hash-based dedup from clustering everything)
        file_hash = hashlib.sha256(f"alert-{i}-{host['name']}-{process}-{random.randint(0,999999)}".encode()).hexdigest()

        # Risk score variation
        risk = rule["risk"] + random.randint(-5, 5)
        risk = max(1, min(100, risk))

        alert = {
            "@timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "kibana.alert.rule.name": rule["name"],
            "kibana.alert.rule.uuid": f"rule-{scenario_idx}-{random.randint(1,3)}",
            "kibana.alert.severity": rule["severity"],
            "kibana.alert.risk_score": risk,
            "kibana.alert.workflow_status": "open",
            "host.name": host["name"],
            "host.ip": [host["ip"]],
            "host.os.name": host["os"],
            "user.name": user,
            "process.name": process,
            "process.executable": f"C:\\Windows\\System32\\{process}" if ".exe" in process else f"/usr/bin/{process}",
            "process.hash.sha256": file_hash,
            "source.ip": host["ip"],
            "destination.ip": dest_ip,
            "destination.domain": dest_domain,
            "file.name": f"payload-{i}.dat",
            "file.hash.sha256": file_hash,
            "dns.question.name": f"{i}.{dest_domain}",
            "url.full": f"https://{dest_domain}/path/{file_hash[:8]}",
            "event.action": action,
            "event.category": scenario["categories"],
            # Fields required by Cases plugin updateAlertsStatus
            "signal.status": "open",
            "kibana.alert.workflow_status_updated_at": ts.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        }

        alerts.append({"_id": f"demo-{i:04d}", "_source": alert})

    return alerts


def print_stats(alerts: list):
    """Print statistics about the generated alerts."""
    hosts = set()
    users = set()
    rules = set()
    host_user_pairs = set()

    for a in alerts:
        src = a["_source"]
        h = src["host.name"]
        u = src["user.name"]
        hosts.add(h)
        users.add(u)
        rules.add(src["kibana.alert.rule.name"])
        host_user_pairs.add(f"{h}/{u}")

    print(f"\n📊 Generated {len(alerts)} alerts:")
    print(f"   Unique hosts: {len(hosts)}")
    print(f"   Unique users: {len(users)}")
    print(f"   Unique rules: {len(rules)}")
    print(f"   Host/user pairs: {len(host_user_pairs)} (→ expected case groups)")
    print()

    # Show top host/user pairs by alert count
    pair_counts: dict[str, int] = {}
    for a in alerts:
        src = a["_source"]
        pair = f"{src['host.name']}/{src['user.name']}"
        pair_counts[pair] = pair_counts.get(pair, 0) + 1

    sorted_pairs = sorted(pair_counts.items(), key=lambda x: -x[1])
    print("   Top 15 entity groups (host/user → alert count):")
    for pair, cnt in sorted_pairs[:15]:
        print(f"     {pair}: {cnt} alerts")
    if len(sorted_pairs) > 15:
        print(f"     ... and {len(sorted_pairs) - 15} more groups")
    print()


def ensure_index():
    """Create the alerts index if it doesn't exist."""
    auth_header = b64encode(ES_AUTH.encode()).decode()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_header}",
    }

    # Check if index exists
    req = urllib.request.Request(f"{ES_URL}/{ALERTS_INDEX}", headers=headers)
    try:
        urllib.request.urlopen(req)
        return  # exists
    except urllib.error.HTTPError:
        pass

    # Create with mapping
    mapping = {
        "settings": {"number_of_shards": 1, "number_of_replicas": 0},
        "mappings": {
            "properties": {
                "@timestamp": {"type": "date"},
                "kibana.alert.rule.name": {"type": "keyword"},
                "kibana.alert.rule.uuid": {"type": "keyword"},
                "kibana.alert.severity": {"type": "keyword"},
                "kibana.alert.risk_score": {"type": "float"},
                "kibana.alert.workflow_status": {"type": "keyword"},
                "kibana.alert.workflow_tags": {"type": "keyword"},
                "kibana.alert.building_block_type": {"type": "keyword"},
                "kibana.alert.pipeline.processed": {"type": "boolean"},
                "host.name": {"type": "keyword"},
                "host.ip": {"type": "ip"},
                "host.os.name": {"type": "keyword"},
                "user.name": {"type": "keyword"},
                "process.name": {"type": "keyword"},
                "process.executable": {"type": "keyword"},
                "process.hash.sha256": {"type": "keyword"},
                "source.ip": {"type": "ip"},
                "destination.ip": {"type": "ip"},
                "destination.domain": {"type": "keyword"},
                "file.name": {"type": "keyword"},
                "file.hash.sha256": {"type": "keyword"},
                "dns.question.name": {"type": "keyword"},
                "url.full": {"type": "keyword"},
                "event.action": {"type": "keyword"},
                "event.category": {"type": "keyword"},
                "signal.status": {"type": "keyword"},
                "kibana.alert.workflow_status_updated_at": {"type": "date"},
                "kibana.alert.workflow_reason": {"type": "keyword"},
            }
        },
    }
    data = json.dumps(mapping).encode()
    req = urllib.request.Request(f"{ES_URL}/{ALERTS_INDEX}", data=data, headers=headers, method="PUT")
    urllib.request.urlopen(req)
    print("✓ Created alerts index")


def cleanup_demo_alerts():
    """Delete existing demo alerts."""
    auth_header = b64encode(ES_AUTH.encode()).decode()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_header}",
    }
    data = json.dumps({"query": {"match_all": {}}}).encode()
    req = urllib.request.Request(
        f"{ES_URL}/{ALERTS_INDEX}/_delete_by_query?conflicts=proceed",
        data=data, headers=headers, method="POST"
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f"✓ Deleted {result.get('deleted', 0)} existing alerts")
    except urllib.error.HTTPError as e:
        print(f"⚠ Cleanup: {e.code} (index may not exist yet)")


def ingest_alerts(alerts: list):
    """Bulk-index alerts into ES."""
    auth_header = b64encode(ES_AUTH.encode()).decode()
    headers = {
        "Content-Type": "application/x-ndjson",
        "Authorization": f"Basic {auth_header}",
    }

    ensure_index()

    # Build bulk payload in chunks of 200
    chunk_size = 200
    total_success = 0

    for chunk_start in range(0, len(alerts), chunk_size):
        chunk = alerts[chunk_start:chunk_start + chunk_size]
        lines = []
        for alert in chunk:
            lines.append(json.dumps({"index": {"_index": ALERTS_INDEX, "_id": alert["_id"]}}))
            lines.append(json.dumps(alert["_source"]))
        payload = "\n".join(lines) + "\n"

        req = urllib.request.Request(
            f"{ES_URL}/_bulk", data=payload.encode(), headers=headers, method="POST"
        )
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())

        success = sum(1 for item in result.get("items", [])
                      if item.get("index", {}).get("status") in (200, 201))
        total_success += success
        print(f"  Chunk {chunk_start}-{chunk_start + len(chunk)}: {success}/{len(chunk)} indexed")

    print(f"\n✓ Ingested {total_success}/{len(alerts)} alerts into {ALERTS_INDEX}")


def main():
    count = 500
    do_ingest = False
    do_cleanup = False

    for arg in sys.argv[1:]:
        if arg == "--ingest":
            do_ingest = True
        elif arg == "--cleanup":
            do_cleanup = True
        elif arg.isdigit():
            count = int(arg)

    alerts = generate_alerts(count)
    print_stats(alerts)

    if do_cleanup:
        cleanup_demo_alerts()

    if do_ingest:
        ingest_alerts(alerts)
    elif not do_cleanup:
        print("  Run with --ingest to bulk-index into ES")
        print("  Run with --cleanup to delete existing demo alerts")
        print(f"  Example: python3 scripts/generate_demo_alerts.py {count} --cleanup --ingest")


if __name__ == "__main__":
    main()
