/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line no-unused-vars
const installableRules = [
  {
    name: 'System Binary Path File Permission Modification',
    description:
      'This rule identifies file permission modification events on files located in common system binary paths. Adversaries may attempt to hide their payloads in the default Linux system directories, and modify the file permissions of these payloads prior to execution.',
    risk_score: 21,
    severity: 'low',
    timestamp_override: 'event.ingested',
    license: 'Elastic License v2',
    note: '## Triage and analysis\n\n> **Disclaimer**:\n> This investigation guide was created using generative AI technology and has been reviewed to improve its accuracy and relevance. While every effort has been made to ensure its quality, we recommend validating the content and adapting it to suit your specific environment and operational needs.\n\n### Investigating System Binary Path File Permission Modification\n\nIn Linux environments, system binary paths contain critical executables. Adversaries may exploit these by altering file permissions to execute malicious payloads. The detection rule monitors processes like `chmod` and `chown` in key directories, flagging suspicious permission changes. It excludes benign activities, focusing on unauthorized modifications to prevent potential execution of harmful scripts.\n\n### Possible investigation steps\n\n- Review the process details to identify the exact command executed, focusing on the process name and arguments, especially those involving `chmod` or `chown` in critical directories like `/bin`, `/usr/bin`, and `/lib`.\n- Examine the parent process information, including the executable path and command line, to determine if the process was initiated by a known or trusted application, excluding those like `udevadm`, `systemd`, or `sudo`.\n- Check the user account associated with the process to verify if the action was performed by an authorized user or if there are signs of compromised credentials.\n- Investigate the file or directory whose permissions were modified to assess its importance and potential impact, focusing on changes to permissions like `4755`, `755`, or `777`.\n- Correlate the event with other security alerts or logs to identify any related suspicious activities, such as unauthorized access attempts or unexpected script executions.\n- Review recent changes or updates in the system that might explain the permission modification, ensuring they align with legitimate administrative tasks or software installations.\n\n### False positive analysis\n\n- System updates and package installations often involve legitimate permission changes in system binary paths. Users can exclude processes with parent executables located in directories like /var/lib/dpkg/info to reduce noise from these activities.\n- Administrative scripts or automation tools may execute chmod or chown commands as part of routine maintenance. Exclude processes with parent names such as udevadm, systemd, or sudo to prevent these from being flagged.\n- Container initialization processes might trigger permission changes. Exclude processes with parent command lines like runc init to avoid false positives related to container setups.\n- Temporary script executions during software installations can cause permission modifications. Exclude processes with parent arguments matching patterns like /var/tmp/rpm-tmp.* to filter out these benign events.\n\n### Response and remediation\n\n- Immediately isolate the affected system from the network to prevent further unauthorized access or execution of malicious payloads.\n- Terminate any suspicious processes identified as executing `chmod` or `chown` commands in critical system binary paths.\n- Revert any unauthorized file permission changes to their original state to ensure system integrity and prevent execution of malicious scripts.\n- Conduct a thorough review of system logs and process execution history to identify any additional unauthorized activities or related threats.\n- Escalate the incident to the security operations team for further investigation and to determine if the threat has spread to other systems.\n- Implement additional monitoring on the affected system and similar environments to detect any recurrence of unauthorized permission modifications.\n- Review and update access controls and permissions policies to minimize the risk of unauthorized modifications in critical system directories.',
    version: 6,
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Execution',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
    ],
    from: 'now-9m',
    author: ['Elastic'],
    references: ['https://blog.exatrack.com/Perfctl-using-portainer-and-new-persistences/'],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [
          {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
          },
        ],
      },
    ],
    setup:
      '## Setup\n\nThis rule requires data coming in from Elastic Defend.\n\n### Elastic Defend Integration Setup\nElastic Defend is integrated into the Elastic Agent using Fleet. Upon configuration, the integration allows the Elastic Agent to monitor events on your host and send data to the Elastic Security app.\n\n#### Prerequisite Requirements:\n- Fleet is required for Elastic Defend.\n- To configure Fleet Server refer to the [documentation](https://www.elastic.co/guide/en/fleet/current/fleet-server.html).\n\n#### The following steps should be executed in order to add the Elastic Defend integration on a Linux System:\n- Go to the Kibana home page and click "Add integrations".\n- In the query bar, search for "Elastic Defend" and select the integration to see more details about it.\n- Click "Add Elastic Defend".\n- Configure the integration name and optionally add a description.\n- Select the type of environment you want to protect, either "Traditional Endpoints" or "Cloud Workloads".\n- Select a configuration preset. Each preset comes with different default settings for Elastic Agent, you can further customize these later by configuring the Elastic Defend integration policy. [Helper guide](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html).\n- We suggest selecting "Complete EDR (Endpoint Detection and Response)" as a configuration setting, that provides "All events; all preventions"\n- Enter a name for the agent policy in "New agent policy name". If other agent policies already exist, you can click the "Existing hosts" tab and select an existing policy instead.\nFor more details on Elastic Agent configuration settings, refer to the [helper guide](https://www.elastic.co/guide/en/fleet/8.10/agent-policy.html).\n- Click "Save and Continue".\n- To complete the integration, select "Add Elastic Agent to your hosts" and continue to the next section to install the Elastic Agent on your hosts.\nFor more details on Elastic Defend refer to the [helper guide](https://www.elastic.co/guide/en/security/current/install-endpoint.html).\n',
    related_integrations: [
      {
        package: 'endpoint',
        version: '^9.0.0',
      },
    ],
    required_fields: [
      {
        name: 'event.action',
        type: 'keyword',
      },
      {
        name: 'event.type',
        type: 'keyword',
      },
      {
        name: 'host.os.type',
        type: 'keyword',
      },
      {
        name: 'process.args',
        type: 'keyword',
      },
      {
        name: 'process.name',
        type: 'keyword',
      },
      {
        name: 'process.parent.args',
        type: 'keyword',
      },
      {
        name: 'process.parent.command_line',
        type: 'wildcard',
      },
      {
        name: 'process.parent.executable',
        type: 'keyword',
      },
      {
        name: 'process.parent.name',
        type: 'keyword',
      },
    ],
    type: 'eql',
    query:
      'process where host.os.type == "linux" and event.type == "start" and event.action == "exec" and process.name == "chmod" and\nprocess.args like (\n  "/bin/*", "/usr/bin/*", "/sbin/*", "/usr/sbin/*", "/usr/local/sbin/*", "/lib/*", "/usr/lib/*", "/lib64/*", "/usr/lib64/*"\n) and\nprocess.args in ("4755", "755", "000", "777", "444", "+x") and not (\n  process.args in (\n    "/bin/chmod", "/usr/bin/chmod", "/usr/local/bin/chmod", "/usr/bin/restic", "/usr/local/bin/ack-tool", "/usr/lib/policykit-1/polkit-agent-helper-1",\n    "/usr/local/bin/deploy-entrypoint.sh", "/usr/local/bin/mc", "/usr/local/bin/start.sh", "/usr/local/sbin/MySQLBackups/mysql_backup.sh",\n    "/usr/bin/coreutils", "/usr/bin/docker-compose", "/usr/bin/cri-dockerd", "/usr/sbin/mkfs.ext5", "/usr/bin/cyclonedx", "/usr/bin/distro",\n    "/usr/bin/telegraf", "/usr/bin/jq", "/usr/bin/google-chrome", "/usr/sbin/login_duo"\n  ) or\n  process.args like "/usr/lib/omnissa/*" or\n  process.parent.executable like (\n    "/tmp/newroot/*", "/var/lib/dpkg/*", "/usr/libexec/postfix/post-install", "/kaniko/executor", "./install_viewagent.sh", "/bin/make" \n  ) or\n  process.parent.args like (\n    "/var/lib/dpkg/*", "/usr/lib/postfix/bin/post-install", "/usr/lib/postfix/sbin/post-install", "/usr/libexec/postfix/post-install",\n    "./install_viewagent.sh", "/usr/lib/omnissa/*", "/var/tmp/rpm-tmp.*"\n  ) or\n  process.parent.name in ("udevadm", "systemd", "entrypoint", "sudo", "dart") or\n  process.parent.command_line == "runc init"\n)\n',
    language: 'eql',
    index: ['logs-endpoint.events.process*'],
    rule_id: '0049cf71-fe13-4d79-b767-f7519921ffb5',
  },
  {
    name: 'Uncommon Destination Port Connection by Web Server',
    description:
      'This rule identifies unusual destination port network activity originating from a web server process. The rule is designed to detect potential web shell activity or unauthorized communication from a web server process to external systems.',
    risk_score: 21,
    severity: 'low',
    timestamp_override: 'event.ingested',
    license: 'Elastic License v2',
    note: " ## Triage and analysis\n\n> **Disclaimer**:\n> This investigation guide was created using generative AI technology and has been reviewed to improve its accuracy and relevance. While every effort has been made to ensure its quality, we recommend validating the content and adapting it to suit your specific environment and operational needs.\n\n### Investigating Uncommon Destination Port Connection by Web Server\n\nWeb servers, crucial for hosting applications, typically communicate over standard ports like 80 and 443. Adversaries may exploit web server processes to establish unauthorized connections to unusual ports, potentially indicating web shell activity or data exfiltration. This detection rule identifies such anomalies by monitoring egress connections from web server processes to non-standard ports, excluding common local IP ranges, thus highlighting potential threats.\n\n### Possible investigation steps\n\n- Review the process name and user associated with the alert to determine if the connection attempt was made by a legitimate web server process or user, as specified in the query fields (e.g., process.name or user.name).\n- Examine the destination IP address to assess whether it is known or suspicious, and check if it falls outside the excluded local IP ranges.\n- Investigate the destination port to understand why the connection was attempted on a non-standard port, and determine if this port is associated with any known services or threats.\n- Check historical logs for any previous connection attempts from the same process or user to the same or similar destination IPs and ports to identify patterns or repeated behavior.\n- Analyze any related network traffic or logs to identify additional context or anomalies that may indicate unauthorized activity or data exfiltration.\n- Correlate the alert with other security events or alerts to determine if it is part of a larger attack pattern or campaign.\n\n### False positive analysis\n\n- Routine administrative tasks or maintenance scripts may trigger alerts if they involve web server processes connecting to non-standard ports. To manage this, identify and document these tasks, then create exceptions for the specific processes and ports involved.\n- Internal monitoring or management tools that use non-standard ports for legitimate purposes can cause false positives. Review the tools in use and exclude their known IP addresses and ports from the rule.\n- Development or testing environments often use non-standard ports for web server processes. Ensure these environments are well-documented and consider excluding their IP ranges or specific ports from the rule.\n- Load balancers or reverse proxies might redirect traffic to non-standard ports as part of their normal operation. Verify the configuration of these devices and exclude their IP addresses and ports if necessary.\n- Custom applications running on web servers may require communication over non-standard ports. Work with application owners to understand these requirements and adjust the rule to exclude these specific cases.\n\n### Response and remediation\n\n- Immediately isolate the affected web server from the network to prevent further unauthorized access or data exfiltration.\n- Conduct a thorough review of the web server's logs and processes to identify any unauthorized changes or suspicious activities, focusing on the processes and user accounts mentioned in the detection rule.\n- Terminate any suspicious processes identified during the investigation that are not part of the standard operation of the web server.\n- Change passwords and review permissions for the user accounts associated with the web server processes to ensure they have not been compromised.\n- Restore the web server from a known good backup if any unauthorized changes or malware are detected, ensuring that the backup is free from compromise.\n- Implement network segmentation to limit the web server's access to critical systems and data, reducing the potential impact of future incidents.\n- Escalate the incident to the security operations team for further analysis and to determine if additional systems may be affected, ensuring comprehensive threat containment and remediation.\n",
    version: 4,
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Persistence',
      'Tactic: Execution',
      'Tactic: Command and Control',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
    ],
    from: 'now-9m',
    author: ['Elastic'],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0003',
          name: 'Persistence',
          reference: 'https://attack.mitre.org/tactics/TA0003/',
        },
        technique: [
          {
            id: 'T1505',
            name: 'Server Software Component',
            reference: 'https://attack.mitre.org/techniques/T1505/',
            subtechnique: [
              {
                id: 'T1505.003',
                name: 'Web Shell',
                reference: 'https://attack.mitre.org/techniques/T1505/003/',
              },
            ],
          },
        ],
      },
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [
          {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
            subtechnique: [
              {
                id: 'T1059.004',
                name: 'Unix Shell',
                reference: 'https://attack.mitre.org/techniques/T1059/004/',
              },
            ],
          },
        ],
      },
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0011',
          name: 'Command and Control',
          reference: 'https://attack.mitre.org/tactics/TA0011/',
        },
        technique: [
          {
            id: 'T1071',
            name: 'Application Layer Protocol',
            reference: 'https://attack.mitre.org/techniques/T1071/',
          },
        ],
      },
    ],
    setup:
      '## Setup\n\nThis rule requires data coming in from Elastic Defend.\n\n### Elastic Defend Integration Setup\nElastic Defend is integrated into the Elastic Agent using Fleet. Upon configuration, the integration allows the Elastic Agent to monitor events on your host and send data to the Elastic Security app.\n\n#### Prerequisite Requirements:\n- Fleet is required for Elastic Defend.\n- To configure Fleet Server refer to the [documentation](https://www.elastic.co/guide/en/fleet/current/fleet-server.html).\n\n#### The following steps should be executed in order to add the Elastic Defend integration on a Linux System:\n- Go to the Kibana home page and click "Add integrations".\n- In the query bar, search for "Elastic Defend" and select the integration to see more details about it.\n- Click "Add Elastic Defend".\n- Configure the integration name and optionally add a description.\n- Select the type of environment you want to protect, either "Traditional Endpoints" or "Cloud Workloads".\n- Select a configuration preset. Each preset comes with different default settings for Elastic Agent, you can further customize these later by configuring the Elastic Defend integration policy. [Helper guide](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html).\n- We suggest selecting "Complete EDR (Endpoint Detection and Response)" as a configuration setting, that provides "All events; all preventions"\n- Enter a name for the agent policy in "New agent policy name". If other agent policies already exist, you can click the "Existing hosts" tab and select an existing policy instead.\nFor more details on Elastic Agent configuration settings, refer to the [helper guide](https://www.elastic.co/guide/en/fleet/8.10/agent-policy.html).\n- Click "Save and Continue".\n- To complete the integration, select "Add Elastic Agent to your hosts" and continue to the next section to install the Elastic Agent on your hosts.\nFor more details on Elastic Defend refer to the [helper guide](https://www.elastic.co/guide/en/security/current/install-endpoint.html).\n',
    related_integrations: [
      {
        package: 'endpoint',
        version: '^9.0.0',
      },
    ],
    required_fields: [
      {
        name: 'destination.ip',
        type: 'ip',
      },
      {
        name: 'destination.port',
        type: 'long',
      },
      {
        name: 'event.action',
        type: 'keyword',
      },
      {
        name: 'event.type',
        type: 'keyword',
      },
      {
        name: 'host.os.type',
        type: 'keyword',
      },
      {
        name: 'network.direction',
        type: 'keyword',
      },
      {
        name: 'process.name',
        type: 'keyword',
      },
      {
        name: 'process.working_directory',
        type: 'keyword',
      },
      {
        name: 'user.id',
        type: 'keyword',
      },
      {
        name: 'user.name',
        type: 'keyword',
      },
    ],
    type: 'eql',
    query:
      'network where host.os.type == "linux" and event.type == "start" and event.action == "connection_attempted" and (\n  process.name like (\n    "apache", "nginx", "apache2", "httpd", "lighttpd", "caddy", "mongrel_rails", "gunicorn",\n    "uwsgi", "openresty", "cherokee", "h2o", "resin", "puma", "unicorn", "traefik", "tornado", "hypercorn",\n    "daphne", "twistd", "yaws", "webfsd", "httpd.worker", "flask", "rails", "mongrel", "php-fpm*", "php-cgi",\n    "php-fcgi", "php-cgi.cagefs", "catalina.sh", "hiawatha", "lswsctrl"\n  ) or\n  user.name in ("apache", "www-data", "httpd", "nginx", "lighttpd", "tomcat", "tomcat8", "tomcat9") or\n  user.id in ("33", "498", "48") or\n  (process.name == "java" and process.working_directory like "/u0?/*")\n) and\nnetwork.direction == "egress" and destination.ip != null and\nnot destination.port in (80, 443, 8080, 8443, 8000, 8888, 3128, 3306, 5432, 8220, 8082) and\nnot cidrmatch(destination.ip, "127.0.0.0/8", "::1","FE80::/10", "FF00::/8", "10.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.0.0/29", "192.0.0.8/32", "192.0.0.9/32",\n"192.0.0.10/32", "192.0.0.170/32", "192.0.0.171/32", "192.0.2.0/24", "192.31.196.0/24", "192.52.193.0/24", "192.168.0.0/16", "192.88.99.0/24",\n"224.0.0.0/4", "100.64.0.0/10", "192.175.48.0/24","198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4")\n',
    language: 'eql',
    index: ['logs-endpoint.events.network*'],
    rule_id: '00546494-5bb0-49d6-9220-5f3b4c12f26a',
  },
  {
    name: 'M365 Security Compliance User Restricted from Sending Email',
    description:
      'Identifies when a user has been restricted from sending email due to exceeding sending limits of the service policies per the Security Compliance Center.',
    risk_score: 47,
    severity: 'medium',
    timestamp_override: 'event.ingested',
    license: 'Elastic License v2',
    note: '## Triage and analysis\n\n> **Disclaimer**:\n> This investigation guide was created using generative AI technology and has been reviewed to improve its accuracy and relevance. While every effort has been made to ensure its quality, we recommend validating the content and adapting it to suit your specific environment and operational needs.\n\n### Investigating M365 Security Compliance User Restricted from Sending Email\n\nMicrosoft 365 enforces email sending limits to prevent abuse and ensure service integrity. Adversaries may exploit compromised accounts to send spam or phishing emails, triggering these limits. The detection rule monitors audit logs for successful restrictions by the Security Compliance Center, indicating potential misuse of valid accounts, aligning with MITRE ATT&CK\'s Initial Access tactic.\n\n### Possible investigation steps\n\n- Review the audit logs in Microsoft 365 to confirm the event details, focusing on entries with event.dataset:o365.audit and event.provider:SecurityComplianceCenter to ensure the restriction was logged correctly.\n- Identify the user account that was restricted by examining the event.action:"User restricted from sending email" and event.outcome:success fields to understand which account triggered the alert.\n- Investigate the recent email activity of the restricted user account to determine if there was any unusual or suspicious behavior, such as a high volume of outbound emails or patterns consistent with spam or phishing.\n- Check for any recent changes in account permissions or configurations that might indicate unauthorized access or compromise, aligning with the MITRE ATT&CK technique T1078 for Valid Accounts.\n- Assess whether there are any other related alerts or incidents involving the same user or similar patterns, which could indicate a broader security issue or coordinated attack.\n\n### False positive analysis\n\n- High-volume legitimate email campaigns by marketing or communication teams can trigger sending limits. Coordinate with these teams to understand their schedules and create exceptions for known campaigns.\n- Automated systems or applications using Microsoft 365 accounts for sending notifications or alerts may exceed limits. Identify these accounts and consider using service accounts with appropriate permissions and limits.\n- Users with delegated access to multiple mailboxes might inadvertently trigger restrictions. Review and adjust permissions or create exceptions for these users if their activity is verified as legitimate.\n- Temporary spikes in email activity due to business needs, such as end-of-quarter communications, can cause false positives. Monitor these periods and adjust thresholds or create temporary exceptions as needed.\n- Misconfigured email clients or scripts that repeatedly attempt to send emails can appear as suspicious activity. Ensure proper configuration and monitor for any unusual patterns that may need exceptions.\n\n### Response and remediation\n\n- Immediately disable the compromised user account to prevent further unauthorized email activity and potential spread of phishing or spam.\n- Conduct a password reset for the affected account and enforce multi-factor authentication (MFA) to enhance security and prevent future unauthorized access.\n- Review the audit logs for any additional suspicious activities associated with the compromised account, such as unusual login locations or times, and investigate any anomalies.\n- Notify the affected user and relevant stakeholders about the incident, providing guidance on recognizing phishing attempts and securing their accounts.\n- Escalate the incident to the security operations team for further analysis and to determine if other accounts or systems have been compromised.\n- Implement additional email filtering rules to block similar phishing or spam patterns identified in the incident to prevent recurrence.\n- Update and enhance detection rules and monitoring to quickly identify and respond to similar threats in the future, leveraging insights from the current incident.',
    version: 211,
    tags: [
      'Domain: Cloud',
      'Data Source: Microsoft 365',
      'Use Case: Configuration Audit',
      'Tactic: Impact',
      'Resources: Investigation Guide',
    ],
    from: 'now-9m',
    author: ['Austin Songer'],
    false_positives: [
      'A user sending emails using personal distribution folders may trigger the event.',
    ],
    references: [
      'https://docs.microsoft.com/en-us/cloud-app-security/anomaly-detection-policy',
      'https://docs.microsoft.com/en-us/cloud-app-security/policy-template-reference',
    ],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0040',
          name: 'Impact',
          reference: 'https://attack.mitre.org/tactics/TA0040/',
        },
        technique: [],
      },
    ],
    setup:
      'The Office 365 Logs Fleet integration, Filebeat module, or similarly structured data is required to be compatible with this rule.',
    related_integrations: [
      {
        package: 'o365',
        version: '^3.0.0',
      },
    ],
    required_fields: [
      {
        name: 'event.action',
        type: 'keyword',
      },
      {
        name: 'event.category',
        type: 'keyword',
      },
      {
        name: 'event.dataset',
        type: 'keyword',
      },
      {
        name: 'event.outcome',
        type: 'keyword',
      },
      {
        name: 'event.provider',
        type: 'keyword',
      },
    ],
    type: 'query',
    index: ['logs-o365.audit-*', 'filebeat-*'],
    query:
      'event.dataset:o365.audit and event.provider:SecurityComplianceCenter and event.category:web and event.action:"User restricted from sending email" and event.outcome:success\n',
    language: 'kuery',
    rule_id: '0136b315-b566-482f-866c-1d8e2477ba16',
  },
  {
    name: 'Potential Network Scan Detected',
    description:
      'This rule identifies a potential port scan from an internal IP address. A port scan is a method utilized by attackers to systematically scan a target system for open ports, allowing them to identify available services and potential vulnerabilities. By mapping out the open ports, attackers can gather critical information to plan and execute targeted attacks, gaining unauthorized access, compromising security, and potentially leading to data breaches, unauthorized control, or further exploitation of the targeted system. This rule defines a threshold-based approach to detect connection attempts from a single internal source to a wide range of destination ports on a single destination.',
    risk_score: 21,
    severity: 'low',
    timestamp_override: 'event.ingested',
    license: 'Elastic License v2',
    note: "## Triage and analysis\n\n> **Disclaimer**:\n> This investigation guide was created using generative AI technology and has been reviewed to improve its accuracy and relevance. While every effort has been made to ensure its quality, we recommend validating the content and adapting it to suit your specific environment and operational needs.\n\n### Investigating Potential Network Scan Detected\n\nNetwork scanning is a technique used to identify open ports and services on a network, often exploited by attackers to find vulnerabilities. Adversaries may use this method to map out a network's structure and identify weak points for further exploitation. The detection rule identifies suspicious activity by monitoring for multiple connection attempts from a single source to numerous destination ports, indicating a potential scan. This helps in early detection and mitigation of reconnaissance activities.\n\n### Possible investigation steps\n\n- Review the source IP address involved in the alert to determine if it belongs to a known or trusted entity within the organization. Check if the IP falls within the specified ranges: 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16.\n- Analyze the network flow logs to identify the specific destination ports that were targeted by the source IP. Determine if these ports are associated with critical services or known vulnerabilities.\n- Correlate the detected activity with any recent changes or updates in the network infrastructure that might explain the scanning behavior, such as new devices or services being deployed.\n- Investigate if there are any other alerts or logs indicating similar scanning activities from the same source IP or other IPs within the same subnet, which might suggest a coordinated scanning effort.\n- Check for any historical data or past incidents involving the source IP to assess if this behavior is part of a recurring pattern or a new anomaly.\n- Consult with network administrators to verify if the detected activity aligns with any scheduled network assessments or security tests that might have been conducted without prior notification.\n\n### False positive analysis\n\n- Internal network scanning tools used for legitimate security assessments can trigger this rule. To manage this, create exceptions for known IP addresses of authorized scanning tools.\n- Automated network monitoring systems that check service availability across multiple ports may be flagged. Exclude these systems by identifying their IP addresses and adding them to an exception list.\n- Load balancers and network devices that perform health checks on various services might cause false positives. Identify these devices and configure the rule to ignore their IP addresses.\n- Development and testing environments where frequent port scanning is part of routine operations can be mistakenly flagged. Implement exceptions for these environments by specifying their IP ranges.\n- Regularly scheduled vulnerability assessments conducted by internal security teams can appear as network scans. Document these activities and exclude the associated IPs from triggering the rule.\n\n### Response and remediation\n\n- Isolate the affected host: Immediately disconnect the source IP from the network to prevent further scanning or potential exploitation of identified vulnerabilities.\n- Conduct a thorough investigation: Analyze the source IP's activity logs to determine if any unauthorized access or data exfiltration has occurred. This will help assess the extent of the threat.\n- Update firewall rules: Implement stricter access controls to limit the number of open ports and restrict unnecessary inbound and outbound traffic from the affected IP range.\n- Patch and update systems: Ensure all systems and services identified during the scan are up-to-date with the latest security patches to mitigate known vulnerabilities.\n- Monitor for recurrence: Set up enhanced monitoring for the source IP and similar scanning patterns to quickly detect and respond to any future scanning attempts.\n- Escalate to security operations: If the scan is part of a larger attack or if sensitive data is at risk, escalate the incident to the security operations team for further analysis and response.\n- Review and enhance detection capabilities: Evaluate the effectiveness of current detection mechanisms and consider integrating additional threat intelligence sources to improve early detection of similar threats.",
    version: 13,
    tags: [
      'Domain: Network',
      'Tactic: Discovery',
      'Tactic: Reconnaissance',
      'Use Case: Network Security Monitoring',
      'Data Source: PAN-OS',
      'Resources: Investigation Guide',
    ],
    from: 'now-9m',
    author: ['Elastic'],
    max_signals: 5,
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0007',
          name: 'Discovery',
          reference: 'https://attack.mitre.org/tactics/TA0007/',
        },
        technique: [
          {
            id: 'T1046',
            name: 'Network Service Discovery',
            reference: 'https://attack.mitre.org/techniques/T1046/',
          },
        ],
      },
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0043',
          name: 'Reconnaissance',
          reference: 'https://attack.mitre.org/tactics/TA0043/',
        },
        technique: [
          {
            id: 'T1595',
            name: 'Active Scanning',
            reference: 'https://attack.mitre.org/techniques/T1595/',
            subtechnique: [
              {
                id: 'T1595.001',
                name: 'Scanning IP Blocks',
                reference: 'https://attack.mitre.org/techniques/T1595/001/',
              },
            ],
          },
        ],
      },
    ],
    related_integrations: [
      {
        package: 'network_traffic',
        version: '^1.33.0',
      },
      {
        package: 'panw',
        version: '^5.2.0',
      },
    ],
    required_fields: [
      {
        name: 'Esql.count_distinct_destination_ports',
        type: 'long',
      },
      {
        name: 'Esql.count_distinct_sensitive_ports',
        type: 'long',
      },
      {
        name: 'Esql.time_window',
        type: 'date',
      },
      {
        name: 'Esql.values_destination_ports',
        type: 'long',
      },
      {
        name: 'Esql.values_sensitive_ports',
        type: 'long',
      },
      {
        name: 'destination.ip',
        type: 'ip',
      },
      {
        name: 'source.ip',
        type: 'ip',
      },
    ],
    type: 'esql',
    language: 'esql',
    query:
      'from logs-network_traffic.*, packetbeat-*, logs-panw.panos*\n| mv_expand event.action\n| where event.action == "network_flow" and destination.port is not null and source.ip is not null and destination.ip is not null\n| eval Esql.time_window = DATE_TRUNC(1min, @timestamp)\n| where CIDR_MATCH(source.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")\n| eval sensitive_port = case(destination.port IN (21, 22, 23, 53, 88, 139, 389, 445, 3389, 5900, 5985, 5986, 9389), true, false)\n| stats\n    Esql.count_distinct_destination_ports = COUNT_DISTINCT(destination.port),\n    Esql.count_distinct_sensitive_ports = COUNT_DISTINCT(destination.port) where sensitive_port == true,\n    Esql.values_destination_ports = VALUES(destination.port),\n    Esql.values_sensitive_ports = VALUES(destination.port) where sensitive_port == true\n  by Esql.time_window, destination.ip, source.ip\n| where (Esql.count_distinct_destination_ports >= 50 or Esql.values_sensitive_ports >= 5)\n| keep source.ip, destination.ip, Esql.*\n',
    rule_id: '0171f283-ade7-4f87-9521-ac346c68cc9b',
  },
  {
    name: 'First Occurrence of GitHub User Interaction with Private Repo',
    description:
      'Detects a new private repo interaction for a GitHub user not seen in the last 14 days.',
    risk_score: 21,
    severity: 'low',
    timestamp_override: 'event.ingested',
    license: 'Elastic License v2',
    building_block_type: 'default',
    version: 207,
    tags: [
      'Domain: Cloud',
      'Use Case: Threat Detection',
      'Use Case: UEBA',
      'Tactic: Execution',
      'Rule Type: BBR',
      'Data Source: Github',
    ],
    from: 'now-9m',
    author: ['Elastic'],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [
          {
            id: 'T1648',
            name: 'Serverless Execution',
            reference: 'https://attack.mitre.org/techniques/T1648/',
          },
        ],
      },
    ],
    related_integrations: [
      {
        package: 'github',
        version: '^2.4.0',
      },
    ],
    required_fields: [
      {
        name: 'event.category',
        type: 'keyword',
      },
      {
        name: 'event.dataset',
        type: 'keyword',
      },
      {
        name: 'github.repo',
        type: 'keyword',
      },
      {
        name: 'github.repository_public',
        type: 'boolean',
      },
      {
        name: 'user.name',
        type: 'keyword',
      },
    ],
    type: 'new_terms',
    query:
      'event.dataset:"github.audit" and event.category:"configuration" and\ngithub.repo:* and user.name:* and \ngithub.repository_public:false\n',
    new_terms_fields: ['user.name', 'github.repo'],
    history_window_start: 'now-5d',
    index: ['logs-github.audit-*'],
    language: 'kuery',
    rule_id: '01c49712-25bc-49d2-a27d-d7ce52f5dc49',
  },
];
