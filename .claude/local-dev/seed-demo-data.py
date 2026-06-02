#!/usr/bin/env python3
"""Seed realistic demo data into local Elasticsearch for AESOP/evals demos.

This script bulk-indexes synthetic but realistic events across the data
streams an Operations / Security analyst would expect:

  - logs-endpoint.events.process-default  (process create/exec/terminate)
  - logs-endpoint.events.file-default     (file create/modify/delete)
  - logs-endpoint.events.network-default  (network connections)
  - logs-system.auth-default              (sshd / sudo auth events)
  - logs-nginx.access-default             (HTTP access logs with attack patterns)
  - metrics-system.cpu-default            (host CPU metrics)

Why bulk + Python instead of synthtrace: synthtrace requires Kibana Fleet
package installation which can take 5-10 min to bootstrap on a cold cluster
and was hanging here. Direct bulk indexing is deterministic and fast (<30 s
total) and we don't need Fleet integrations to demo AESOP discovery.

Usage:
  python3 .claude/local-dev/seed-demo-data.py
"""
from __future__ import annotations

import base64
import hashlib
import json
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

ES_URL = "http://localhost:9200"
AUTH = base64.b64encode(b"elastic:changeme").decode()
HEADERS = {
    "Content-Type": "application/x-ndjson",
    "Authorization": f"Basic {AUTH}",
}

random.seed(42)

NOW = datetime.now(timezone.utc)
WINDOW_HOURS = 168  # 7 days

HOSTS = [
    {"name": "ip-10-0-1-12.ec2.internal", "ip": "10.0.1.12", "os": "linux"},
    {"name": "ip-10-0-1-47.ec2.internal", "ip": "10.0.1.47", "os": "linux"},
    {"name": "WIN-WEB-01", "ip": "10.0.2.21", "os": "windows"},
    {"name": "WIN-DB-01", "ip": "10.0.2.45", "os": "windows"},
    {"name": "macbook-jdoe.local", "ip": "192.168.1.34", "os": "macos"},
]
USERS = ["jdoe", "asmith", "bchen", "kjohnson", "root", "ec2-user", "admin"]
PROCESSES = [
    ("/usr/bin/sshd", "sshd"),
    ("/usr/bin/curl", "curl"),
    ("/usr/bin/bash", "bash"),
    ("/usr/bin/python3", "python3"),
    ("/usr/bin/node", "node"),
    ("/usr/sbin/cron", "cron"),
    ("/bin/ls", "ls"),
    ("/bin/cat", "cat"),
    ("C:\\Windows\\System32\\powershell.exe", "powershell.exe"),
    ("C:\\Windows\\System32\\cmd.exe", "cmd.exe"),
    ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "Google Chrome"),
]
SUSPICIOUS_PROCESSES = [
    ("/tmp/.x/cryptominer", "cryptominer"),  # malware
    ("/usr/bin/nc", "nc"),  # netcat
    ("/usr/bin/wget", "wget"),  # download tool
    ("C:\\Windows\\Temp\\mimi.exe", "mimi.exe"),  # mimikatz-ish
]
URLS = [
    "/", "/login", "/api/v1/users", "/api/v1/accounts", "/api/v1/orders",
    "/static/main.js", "/static/style.css", "/health", "/metrics",
    "/admin", "/wp-admin", "/.env", "/api/v1/users/../../../etc/passwd",
]
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "curl/8.4.0",
    "python-requests/2.31.0",
    "Mozilla/5.0 (compatible; Googlebot/2.1)",
    "sqlmap/1.7",  # attack tool
]


def random_ts() -> str:
    """Random timestamp within the window, biased toward recent."""
    # Beta(2,5) skews toward recent past
    bias = random.betavariate(2, 5)
    minutes_ago = bias * WINDOW_HOURS * 60
    ts = NOW - timedelta(minutes=minutes_ago)
    return ts.isoformat().replace("+00:00", "Z")


def random_pid() -> int:
    return random.randint(100, 65000)


def hash_str(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def gen_process_event() -> dict:
    host = random.choice(HOSTS)
    user = random.choice(USERS)
    # 5% suspicious
    proc = (
        random.choice(SUSPICIOUS_PROCESSES)
        if random.random() < 0.05
        else random.choice(PROCESSES)
    )
    action = random.choices(
        ["start", "exec", "end", "fork"], weights=[40, 30, 25, 5]
    )[0]
    return {
        "@timestamp": random_ts(),
        "host": {"name": host["name"], "ip": [host["ip"]], "os": {"family": host["os"]}},
        "user": {"name": user, "id": str(1000 + USERS.index(user))},
        "event": {
            "module": "endpoint",
            "dataset": "endpoint.events.process",
            "kind": "event",
            "category": ["process"],
            "type": [action],
            "action": f"process_{action}",
        },
        "process": {
            "executable": proc[0],
            "name": proc[1],
            "pid": random_pid(),
            "args": [proc[0], "--config", "/etc/app.conf"] if random.random() < 0.6 else [proc[0]],
            "command_line": f"{proc[0]} --config /etc/app.conf",
            "hash": {"sha256": hash_str(proc[0] + str(random.random()))},
            "parent": {"pid": random_pid(), "name": "systemd" if host["os"] == "linux" else "services.exe"},
        },
        "data_stream": {
            "type": "logs",
            "dataset": "endpoint.events.process",
            "namespace": "default",
        },
    }


def gen_file_event() -> dict:
    host = random.choice(HOSTS)
    user = random.choice(USERS)
    paths = [
        "/var/log/syslog", "/etc/passwd", "/etc/shadow", "/home/jdoe/.ssh/authorized_keys",
        "/tmp/upload-12345.bin", "/var/lib/docker/overlay2/abc/diff/app.log",
        "C:\\Users\\Public\\Documents\\report.docx",
        "C:\\Windows\\Temp\\install.log",
    ]
    path = random.choice(paths)
    action = random.choices(["created", "modified", "deleted"], weights=[35, 50, 15])[0]
    return {
        "@timestamp": random_ts(),
        "host": {"name": host["name"], "ip": [host["ip"]], "os": {"family": host["os"]}},
        "user": {"name": user},
        "event": {
            "module": "endpoint",
            "dataset": "endpoint.events.file",
            "kind": "event",
            "category": ["file"],
            "type": [action],
            "action": f"file_{action}",
        },
        "file": {
            "path": path,
            "name": path.split("/")[-1].split("\\")[-1],
            "size": random.randint(100, 5_000_000),
            "extension": path.rsplit(".", 1)[-1] if "." in path.rsplit("/", 1)[-1] else "",
            "hash": {"sha256": hash_str(path + str(random.random()))},
        },
        "data_stream": {
            "type": "logs",
            "dataset": "endpoint.events.file",
            "namespace": "default",
        },
    }


def gen_network_event() -> dict:
    host = random.choice(HOSTS)
    direction = random.choice(["ingress", "egress"])
    proto = random.choices(["tcp", "udp", "icmp"], weights=[80, 15, 5])[0]
    dest_ip = (
        f"{random.randint(1, 254)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        if direction == "egress"
        else host["ip"]
    )
    src_ip = (
        host["ip"]
        if direction == "egress"
        else f"{random.randint(1, 254)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
    )
    return {
        "@timestamp": random_ts(),
        "host": {"name": host["name"], "ip": [host["ip"]]},
        "event": {
            "module": "endpoint",
            "dataset": "endpoint.events.network",
            "kind": "event",
            "category": ["network"],
            "type": ["connection"],
            "action": "connection_attempted",
        },
        "network": {
            "direction": direction,
            "transport": proto,
            "bytes": random.randint(40, 1_500_000),
        },
        "source": {"ip": src_ip, "port": random.randint(1024, 65535)},
        "destination": {
            "ip": dest_ip,
            "port": random.choice([22, 80, 443, 3306, 5432, 6379, 8080, 9200]),
        },
        "data_stream": {
            "type": "logs",
            "dataset": "endpoint.events.network",
            "namespace": "default",
        },
    }


def gen_auth_event() -> dict:
    host = random.choice([h for h in HOSTS if h["os"] == "linux"])
    user = random.choice(USERS)
    outcome = random.choices(["success", "failure"], weights=[80, 20])[0]
    method = random.choice(["publickey", "password"])
    src_ip = f"{random.randint(1, 254)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
    return {
        "@timestamp": random_ts(),
        "host": {"name": host["name"], "ip": [host["ip"]], "os": {"family": "linux"}},
        "user": {"name": user},
        "event": {
            "module": "system",
            "dataset": "system.auth",
            "kind": "event",
            "category": ["authentication"],
            "type": ["start"],
            "action": "ssh_login",
            "outcome": outcome,
        },
        "source": {"ip": src_ip},
        "system": {"auth": {"ssh": {"method": method, "event": "Accepted" if outcome == "success" else "Failed"}}},
        "message": f"sshd[{random_pid()}]: {'Accepted' if outcome=='success' else 'Failed'} {method} for {user} from {src_ip}",
        "data_stream": {
            "type": "logs",
            "dataset": "system.auth",
            "namespace": "default",
        },
    }


def gen_nginx_access() -> dict:
    host = random.choice([h for h in HOSTS if "WEB" in h["name"].upper() or "ec2" in h["name"]])
    url = random.choice(URLS)
    ua = random.choice(USER_AGENTS)
    # Attacks more likely from sqlmap UA, normal otherwise
    if ua.startswith("sqlmap"):
        status = random.choices([200, 403, 404, 500], weights=[5, 60, 25, 10])[0]
    else:
        status = random.choices([200, 301, 304, 401, 403, 404, 500], weights=[60, 5, 15, 5, 5, 8, 2])[0]
    method = random.choices(["GET", "POST", "PUT", "DELETE"], weights=[70, 20, 5, 5])[0]
    src_ip = f"{random.randint(1, 254)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
    return {
        "@timestamp": random_ts(),
        "host": {"name": host["name"], "ip": [host["ip"]]},
        "event": {
            "module": "nginx",
            "dataset": "nginx.access",
            "kind": "event",
            "category": ["web"],
            "outcome": "success" if status < 400 else "failure",
        },
        "http": {
            "request": {"method": method, "bytes": random.randint(100, 2000)},
            "response": {"status_code": status, "bytes": random.randint(200, 50000)},
        },
        "url": {"path": url, "original": url},
        "source": {"ip": src_ip},
        "user_agent": {"original": ua, "name": ua.split("/")[0]},
        "data_stream": {
            "type": "logs",
            "dataset": "nginx.access",
            "namespace": "default",
        },
    }


def gen_cpu_metric() -> dict:
    host = random.choice(HOSTS)
    cpu_pct = max(1, min(100, random.gauss(35, 18)))
    return {
        "@timestamp": random_ts(),
        "host": {"name": host["name"], "ip": [host["ip"]], "os": {"family": host["os"]}},
        "event": {"module": "system", "dataset": "system.cpu", "kind": "metric"},
        "system": {"cpu": {"total": {"norm": {"pct": round(cpu_pct / 100, 4)}}}},
        "data_stream": {
            "type": "metrics",
            "dataset": "system.cpu",
            "namespace": "default",
        },
    }


def bulk_index(data_stream: str, docs: list[dict]) -> tuple[int, int]:
    """POST docs to a data stream via _bulk. Returns (indexed, errors)."""
    lines: list[str] = []
    for d in docs:
        lines.append(json.dumps({"create": {"_index": data_stream}}))
        lines.append(json.dumps(d, default=str))
    body = ("\n".join(lines) + "\n").encode()
    req = urllib.request.Request(
        f"{ES_URL}/_bulk?refresh=false",
        data=body,
        headers=HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read())
            errors = sum(1 for it in payload.get("items", []) if "error" in it.get("create", {}))
            indexed = len(docs) - errors
            if errors:
                # Surface the first error so the user can see what's wrong
                first_err = next(
                    it["create"]["error"] for it in payload["items"] if "error" in it.get("create", {})
                )
                print(f"  WARN: {errors}/{len(docs)} failed; first error: {first_err}", file=sys.stderr)
            return indexed, errors
    except urllib.error.HTTPError as e:
        body_msg = e.read().decode()[:300]
        print(f"  ERROR: HTTP {e.code} for {data_stream}: {body_msg}", file=sys.stderr)
        return 0, len(docs)


def main() -> int:
    streams = [
        ("logs-endpoint.events.process-default", gen_process_event, 1000),
        ("logs-endpoint.events.file-default", gen_file_event, 600),
        ("logs-endpoint.events.network-default", gen_network_event, 800),
        ("logs-system.auth-default", gen_auth_event, 400),
        ("logs-nginx.access-default", gen_nginx_access, 1000),
        ("metrics-system.cpu-default", gen_cpu_metric, 500),
    ]

    grand_total = 0
    grand_errors = 0
    for ds, gen, count in streams:
        print(f"\nIndexing {count} docs → {ds}")
        # Chunk to keep _bulk requests under 5MB
        chunk = 500
        ds_indexed = 0
        ds_errors = 0
        for offset in range(0, count, chunk):
            n = min(chunk, count - offset)
            docs = [gen() for _ in range(n)]
            indexed, errors = bulk_index(ds, docs)
            ds_indexed += indexed
            ds_errors += errors
        print(f"  → {ds_indexed} indexed, {ds_errors} errors")
        grand_total += ds_indexed
        grand_errors += ds_errors

    # Refresh so docs are immediately searchable
    refresh_req = urllib.request.Request(
        f"{ES_URL}/logs-*,metrics-*/_refresh",
        headers={"Authorization": f"Basic {AUTH}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(refresh_req, timeout=30).read()
    except Exception as e:
        print(f"WARN: refresh failed: {e}", file=sys.stderr)

    print(f"\nDone. Indexed {grand_total} docs across {len(streams)} data streams ({grand_errors} errors).")
    return 1 if grand_errors > 0 and grand_total == 0 else 0


if __name__ == "__main__":
    sys.exit(main())
