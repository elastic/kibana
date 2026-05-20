export declare const DATA_TELEMETRY_ID = "data";
export declare const DATA_KNOWN_TYPES: readonly ["logs", "traces", "metrics"];
export type DataTelemetryType = (typeof DATA_KNOWN_TYPES)[number];
export type DataPatternName = (typeof DATA_DATASETS_INDEX_PATTERNS)[number]['patternName'];
export declare const DATA_DATASETS_INDEX_PATTERNS: readonly [{
    readonly pattern: ".ent-search-*";
    readonly patternName: "enterprise-search";
}, {
    readonly pattern: ".app-search-*";
    readonly patternName: "app-search";
}, {
    readonly pattern: "*magento2*";
    readonly patternName: "magento2";
}, {
    readonly pattern: "*magento*";
    readonly patternName: "magento";
}, {
    readonly pattern: "*shopify*";
    readonly patternName: "shopify";
}, {
    readonly pattern: "*wordpress*";
    readonly patternName: "wordpress";
}, {
    readonly pattern: "*drupal*";
    readonly patternName: "drupal";
}, {
    readonly pattern: "*joomla*";
    readonly patternName: "joomla";
}, {
    readonly pattern: "*search*";
    readonly patternName: "search";
}, {
    readonly pattern: "*sharepoint*";
    readonly patternName: "sharepoint";
}, {
    readonly pattern: "*squarespace*";
    readonly patternName: "squarespace";
}, {
    readonly pattern: "*sitecore*";
    readonly patternName: "sitecore";
}, {
    readonly pattern: "*weebly*";
    readonly patternName: "weebly";
}, {
    readonly pattern: "*acquia*";
    readonly patternName: "acquia";
}, {
    readonly pattern: "filebeat-*";
    readonly patternName: "filebeat";
    readonly shipper: "filebeat";
}, {
    readonly pattern: "*filebeat*";
    readonly patternName: "generic-filebeat";
}, {
    readonly pattern: "metricbeat-*";
    readonly patternName: "metricbeat";
    readonly shipper: "metricbeat";
}, {
    readonly pattern: "*metricbeat*";
    readonly patternName: "generic-metricbeat";
}, {
    readonly pattern: "apm-*";
    readonly patternName: "apm";
    readonly shipper: "apm";
}, {
    readonly pattern: "functionbeat-*";
    readonly patternName: "functionbeat";
    readonly shipper: "functionbeat";
}, {
    readonly pattern: "*functionbeat*";
    readonly patternName: "generic-functionbeat";
}, {
    readonly pattern: "heartbeat-*";
    readonly patternName: "heartbeat";
    readonly shipper: "heartbeat";
}, {
    readonly pattern: "*heartbeat*";
    readonly patternName: "generic-heartbeat";
}, {
    readonly pattern: "logstash-*";
    readonly patternName: "logstash";
    readonly shipper: "logstash";
}, {
    readonly pattern: "*logstash*";
    readonly patternName: "generic-logstash";
}, {
    readonly pattern: "fluentd*";
    readonly patternName: "fluentd";
}, {
    readonly pattern: "telegraf*";
    readonly patternName: "telegraf";
}, {
    readonly pattern: "prometheusbeat*";
    readonly patternName: "prometheusbeat";
}, {
    readonly pattern: "fluentbit*";
    readonly patternName: "fluentbit";
}, {
    readonly pattern: "fluent-bit*";
    readonly patternName: "fluentbit";
}, {
    readonly pattern: "*nginx*";
    readonly patternName: "nginx";
}, {
    readonly pattern: "*apache*";
    readonly patternName: "apache";
}, {
    readonly pattern: "logs-*-*";
    readonly patternName: "dsns-logs";
}, {
    readonly pattern: "*logs*";
    readonly patternName: "generic-logs";
}, {
    readonly pattern: "logstash-*";
    readonly patternName: "logstash";
    readonly shipper: "logstash";
}, {
    readonly pattern: "endgame-*";
    readonly patternName: "endgame";
    readonly shipper: "endgame";
}, {
    readonly pattern: "logs-endpoint.*";
    readonly patternName: "logs-endpoint";
    readonly shipper: "endpoint";
}, {
    readonly pattern: "metrics-endpoint.*";
    readonly patternName: "metrics-endpoint";
    readonly shipper: "endpoint";
}, {
    readonly pattern: ".siem-signals-*";
    readonly patternName: "siem-signals";
}, {
    readonly pattern: "auditbeat-*";
    readonly patternName: "auditbeat";
    readonly shipper: "auditbeat";
}, {
    readonly pattern: "winlogbeat-*";
    readonly patternName: "winlogbeat";
    readonly shipper: "winlogbeat";
}, {
    readonly pattern: "packetbeat-*";
    readonly patternName: "packetbeat";
    readonly shipper: "packetbeat";
}, {
    readonly pattern: "filebeat-*";
    readonly patternName: "filebeat";
    readonly shipper: "filebeat";
}, {
    readonly pattern: ".internal.alerts-*";
    readonly patternName: "alerts";
}, {
    readonly pattern: "*apache*";
    readonly patternName: "apache";
}, {
    readonly pattern: "*tomcat*";
    readonly patternName: "tomcat";
}, {
    readonly pattern: "*artifactory*";
    readonly patternName: "artifactory";
}, {
    readonly pattern: "*aruba*";
    readonly patternName: "aruba";
}, {
    readonly pattern: "*barracuda*";
    readonly patternName: "barracuda";
}, {
    readonly pattern: "*bluecoat*";
    readonly patternName: "bluecoat";
}, {
    readonly pattern: "arcsight-*";
    readonly patternName: "arcsight";
    readonly shipper: "arcsight";
}, {
    readonly pattern: "*checkpoint*";
    readonly patternName: "checkpoint";
}, {
    readonly pattern: "*cisco*";
    readonly patternName: "cisco";
}, {
    readonly pattern: "*citrix*";
    readonly patternName: "citrix";
}, {
    readonly pattern: "*cyberark*";
    readonly patternName: "cyberark";
}, {
    readonly pattern: "*cylance*";
    readonly patternName: "cylance";
}, {
    readonly pattern: "*fireeye*";
    readonly patternName: "fireeye";
}, {
    readonly pattern: "*fortinet*";
    readonly patternName: "fortinet";
}, {
    readonly pattern: "*infoblox*";
    readonly patternName: "infoblox";
}, {
    readonly pattern: "*kaspersky*";
    readonly patternName: "kaspersky";
}, {
    readonly pattern: "*mcafee*";
    readonly patternName: "mcafee";
}, {
    readonly pattern: "*paloaltonetworks*";
    readonly patternName: "paloaltonetworks";
}, {
    readonly pattern: "pan-*";
    readonly patternName: "paloaltonetworks";
}, {
    readonly pattern: "pan_*";
    readonly patternName: "paloaltonetworks";
}, {
    readonly pattern: "pan.*";
    readonly patternName: "paloaltonetworks";
}, {
    readonly pattern: "rsa.*";
    readonly patternName: "rsa";
}, {
    readonly pattern: "rsa-*";
    readonly patternName: "rsa";
}, {
    readonly pattern: "rsa_*";
    readonly patternName: "rsa";
}, {
    readonly pattern: "snort-*";
    readonly patternName: "snort";
}, {
    readonly pattern: "logstash-snort*";
    readonly patternName: "snort";
}, {
    readonly pattern: "*sonicwall*";
    readonly patternName: "sonicwall";
}, {
    readonly pattern: "*sophos*";
    readonly patternName: "sophos";
}, {
    readonly pattern: "squid-*";
    readonly patternName: "squid";
}, {
    readonly pattern: "squid_*";
    readonly patternName: "squid";
}, {
    readonly pattern: "squid.*";
    readonly patternName: "squid";
}, {
    readonly pattern: "*symantec*";
    readonly patternName: "symantec";
}, {
    readonly pattern: "*tippingpoint*";
    readonly patternName: "tippingpoint";
}, {
    readonly pattern: "*trendmicro*";
    readonly patternName: "trendmicro";
}, {
    readonly pattern: "*tripwire*";
    readonly patternName: "tripwire";
}, {
    readonly pattern: "*zscaler*";
    readonly patternName: "zscaler";
}, {
    readonly pattern: "*zeek*";
    readonly patternName: "zeek";
}, {
    readonly pattern: "*sigma_doc*";
    readonly patternName: "sigma_doc";
}, {
    readonly pattern: "ecs-corelight*";
    readonly patternName: "ecs-corelight";
}, {
    readonly pattern: "*suricata*";
    readonly patternName: "suricata";
}, {
    readonly pattern: "*wazuh*";
    readonly patternName: "wazuh";
}, {
    readonly pattern: "*meow*";
    readonly patternName: "meow";
}];
export declare const DATA_DATASETS_INDEX_PATTERNS_UNIQUE: ({
    readonly pattern: ".ent-search-*";
    readonly patternName: "enterprise-search";
} | {
    readonly pattern: ".app-search-*";
    readonly patternName: "app-search";
} | {
    readonly pattern: "*magento2*";
    readonly patternName: "magento2";
} | {
    readonly pattern: "*magento*";
    readonly patternName: "magento";
} | {
    readonly pattern: "*shopify*";
    readonly patternName: "shopify";
} | {
    readonly pattern: "*wordpress*";
    readonly patternName: "wordpress";
} | {
    readonly pattern: "*drupal*";
    readonly patternName: "drupal";
} | {
    readonly pattern: "*joomla*";
    readonly patternName: "joomla";
} | {
    readonly pattern: "*search*";
    readonly patternName: "search";
} | {
    readonly pattern: "*sharepoint*";
    readonly patternName: "sharepoint";
} | {
    readonly pattern: "*squarespace*";
    readonly patternName: "squarespace";
} | {
    readonly pattern: "*sitecore*";
    readonly patternName: "sitecore";
} | {
    readonly pattern: "*weebly*";
    readonly patternName: "weebly";
} | {
    readonly pattern: "*acquia*";
    readonly patternName: "acquia";
} | {
    readonly pattern: "filebeat-*";
    readonly patternName: "filebeat";
    readonly shipper: "filebeat";
} | {
    readonly pattern: "*filebeat*";
    readonly patternName: "generic-filebeat";
} | {
    readonly pattern: "metricbeat-*";
    readonly patternName: "metricbeat";
    readonly shipper: "metricbeat";
} | {
    readonly pattern: "*metricbeat*";
    readonly patternName: "generic-metricbeat";
} | {
    readonly pattern: "apm-*";
    readonly patternName: "apm";
    readonly shipper: "apm";
} | {
    readonly pattern: "functionbeat-*";
    readonly patternName: "functionbeat";
    readonly shipper: "functionbeat";
} | {
    readonly pattern: "*functionbeat*";
    readonly patternName: "generic-functionbeat";
} | {
    readonly pattern: "heartbeat-*";
    readonly patternName: "heartbeat";
    readonly shipper: "heartbeat";
} | {
    readonly pattern: "*heartbeat*";
    readonly patternName: "generic-heartbeat";
} | {
    readonly pattern: "logstash-*";
    readonly patternName: "logstash";
    readonly shipper: "logstash";
} | {
    readonly pattern: "*logstash*";
    readonly patternName: "generic-logstash";
} | {
    readonly pattern: "fluentd*";
    readonly patternName: "fluentd";
} | {
    readonly pattern: "telegraf*";
    readonly patternName: "telegraf";
} | {
    readonly pattern: "prometheusbeat*";
    readonly patternName: "prometheusbeat";
} | {
    readonly pattern: "fluentbit*";
    readonly patternName: "fluentbit";
} | {
    readonly pattern: "fluent-bit*";
    readonly patternName: "fluentbit";
} | {
    readonly pattern: "*nginx*";
    readonly patternName: "nginx";
} | {
    readonly pattern: "*apache*";
    readonly patternName: "apache";
} | {
    readonly pattern: "logs-*-*";
    readonly patternName: "dsns-logs";
} | {
    readonly pattern: "*logs*";
    readonly patternName: "generic-logs";
} | {
    readonly pattern: "logstash-*";
    readonly patternName: "logstash";
    readonly shipper: "logstash";
} | {
    readonly pattern: "endgame-*";
    readonly patternName: "endgame";
    readonly shipper: "endgame";
} | {
    readonly pattern: "logs-endpoint.*";
    readonly patternName: "logs-endpoint";
    readonly shipper: "endpoint";
} | {
    readonly pattern: "metrics-endpoint.*";
    readonly patternName: "metrics-endpoint";
    readonly shipper: "endpoint";
} | {
    readonly pattern: ".siem-signals-*";
    readonly patternName: "siem-signals";
} | {
    readonly pattern: "auditbeat-*";
    readonly patternName: "auditbeat";
    readonly shipper: "auditbeat";
} | {
    readonly pattern: "winlogbeat-*";
    readonly patternName: "winlogbeat";
    readonly shipper: "winlogbeat";
} | {
    readonly pattern: "packetbeat-*";
    readonly patternName: "packetbeat";
    readonly shipper: "packetbeat";
} | {
    readonly pattern: "filebeat-*";
    readonly patternName: "filebeat";
    readonly shipper: "filebeat";
} | {
    readonly pattern: ".internal.alerts-*";
    readonly patternName: "alerts";
} | {
    readonly pattern: "*apache*";
    readonly patternName: "apache";
} | {
    readonly pattern: "*tomcat*";
    readonly patternName: "tomcat";
} | {
    readonly pattern: "*artifactory*";
    readonly patternName: "artifactory";
} | {
    readonly pattern: "*aruba*";
    readonly patternName: "aruba";
} | {
    readonly pattern: "*barracuda*";
    readonly patternName: "barracuda";
} | {
    readonly pattern: "*bluecoat*";
    readonly patternName: "bluecoat";
} | {
    readonly pattern: "arcsight-*";
    readonly patternName: "arcsight";
    readonly shipper: "arcsight";
} | {
    readonly pattern: "*checkpoint*";
    readonly patternName: "checkpoint";
} | {
    readonly pattern: "*cisco*";
    readonly patternName: "cisco";
} | {
    readonly pattern: "*citrix*";
    readonly patternName: "citrix";
} | {
    readonly pattern: "*cyberark*";
    readonly patternName: "cyberark";
} | {
    readonly pattern: "*cylance*";
    readonly patternName: "cylance";
} | {
    readonly pattern: "*fireeye*";
    readonly patternName: "fireeye";
} | {
    readonly pattern: "*fortinet*";
    readonly patternName: "fortinet";
} | {
    readonly pattern: "*infoblox*";
    readonly patternName: "infoblox";
} | {
    readonly pattern: "*kaspersky*";
    readonly patternName: "kaspersky";
} | {
    readonly pattern: "*mcafee*";
    readonly patternName: "mcafee";
} | {
    readonly pattern: "*paloaltonetworks*";
    readonly patternName: "paloaltonetworks";
} | {
    readonly pattern: "pan-*";
    readonly patternName: "paloaltonetworks";
} | {
    readonly pattern: "pan_*";
    readonly patternName: "paloaltonetworks";
} | {
    readonly pattern: "pan.*";
    readonly patternName: "paloaltonetworks";
} | {
    readonly pattern: "rsa.*";
    readonly patternName: "rsa";
} | {
    readonly pattern: "rsa-*";
    readonly patternName: "rsa";
} | {
    readonly pattern: "rsa_*";
    readonly patternName: "rsa";
} | {
    readonly pattern: "snort-*";
    readonly patternName: "snort";
} | {
    readonly pattern: "logstash-snort*";
    readonly patternName: "snort";
} | {
    readonly pattern: "*sonicwall*";
    readonly patternName: "sonicwall";
} | {
    readonly pattern: "*sophos*";
    readonly patternName: "sophos";
} | {
    readonly pattern: "squid-*";
    readonly patternName: "squid";
} | {
    readonly pattern: "squid_*";
    readonly patternName: "squid";
} | {
    readonly pattern: "squid.*";
    readonly patternName: "squid";
} | {
    readonly pattern: "*symantec*";
    readonly patternName: "symantec";
} | {
    readonly pattern: "*tippingpoint*";
    readonly patternName: "tippingpoint";
} | {
    readonly pattern: "*trendmicro*";
    readonly patternName: "trendmicro";
} | {
    readonly pattern: "*tripwire*";
    readonly patternName: "tripwire";
} | {
    readonly pattern: "*zscaler*";
    readonly patternName: "zscaler";
} | {
    readonly pattern: "*zeek*";
    readonly patternName: "zeek";
} | {
    readonly pattern: "*sigma_doc*";
    readonly patternName: "sigma_doc";
} | {
    readonly pattern: "ecs-corelight*";
    readonly patternName: "ecs-corelight";
} | {
    readonly pattern: "*suricata*";
    readonly patternName: "suricata";
} | {
    readonly pattern: "*wazuh*";
    readonly patternName: "wazuh";
} | {
    readonly pattern: "*meow*";
    readonly patternName: "meow";
})[];
