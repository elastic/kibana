export const threatEcs = {
  enrichments: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'threat-enrichments',
    description: 'A list of associated indicators objects enriching the event, and the context of that association/enrichment.',
    flat_name: 'threat.enrichments',
    level: 'extended',
    name: 'enrichments',
    normalize: [ 'array' ],
    short: 'List of objects containing indicators enriching the event.',
    type: 'nested',
    indicator: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'threat-enrichments-indicator',
      description: [Object],
      flat_name: 'threat.enrichments.indicator',
      level: 'extended',
      name: 'enrichments.indicator',
      normalize: [],
      short: 'Object containing indicators enriching the event.',
      type: [Object],
      as: [Object],
      confidence: [Object],
      email: [Object],
      file: [Object],
      first_seen: [Object],
      geo: [Object],
      ip: [Object],
      last_seen: [Object],
      marking: [Object],
      modified_at: [Object],
      port: [Object],
      provider: [Object],
      reference: [Object],
      registry: [Object],
      scanner_stats: [Object],
      sightings: [Object],
      url: [Object],
      x509: [Object]
    },
    matched: {
      atomic: [Object],
      field: [Object],
      id: [Object],
      index: [Object],
      occurred: [Object],
      type: [Object]
    }
  },
  feed: {
    dashboard_id: {
      dashed_name: 'threat-feed-dashboard-id',
      description: 'The saved object ID of the dashboard belonging to the threat feed for displaying dashboard links to threat feeds in Kibana.',
      example: '5ba16340-72e6-11eb-a3e3-b3cc7c78a70f',
      flat_name: 'threat.feed.dashboard_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.dashboard_id',
      normalize: [],
      short: 'Feed dashboard ID.',
      type: 'keyword'
    },
    description: {
      dashed_name: 'threat-feed-description',
      description: 'Description of the threat feed in a UI friendly format.',
      example: 'Threat feed from the AlienVault Open Threat eXchange network.',
      flat_name: 'threat.feed.description',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.description',
      normalize: [],
      short: 'Description of the threat feed.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-feed-name',
      description: 'The name of the threat feed in UI friendly format.',
      example: 'AlienVault OTX',
      flat_name: 'threat.feed.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.name',
      normalize: [],
      short: 'Name of the threat feed.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-feed-reference',
      description: 'Reference information for the threat feed in a UI friendly format.',
      example: 'https://otx.alienvault.com',
      flat_name: 'threat.feed.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.reference',
      normalize: [],
      short: 'Reference for the threat feed.',
      type: 'keyword'
    }
  },
  framework: {
    dashed_name: 'threat-framework',
    description: 'Name of the threat framework used to further categorize and classify the tactic and technique of the reported threat. Framework classification can be provided by detecting systems, evaluated at ingest time, or retrospectively tagged to events.',
    example: 'MITRE ATT&CK',
    flat_name: 'threat.framework',
    ignore_above: 1024,
    level: 'extended',
    name: 'framework',
    normalize: [],
    short: 'Threat classification framework.',
    type: 'keyword'
  },
  group: {
    alias: {
      dashed_name: 'threat-group-alias',
      description: 'The alias(es) of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group alias(es).',
      example: '[ "Magecart Group 6" ]',
      flat_name: 'threat.group.alias',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.alias',
      normalize: [Array],
      short: 'Alias of the group.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'threat-group-id',
      description: 'The id of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group id.',
      example: 'G0037',
      flat_name: 'threat.group.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.id',
      normalize: [],
      short: 'ID of the group.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-group-name',
      description: 'The name of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group name.',
      example: 'FIN6',
      flat_name: 'threat.group.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.name',
      normalize: [],
      short: 'Name of the group.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-group-reference',
      description: 'The reference URL of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group reference URL.',
      example: 'https://attack.mitre.org/groups/G0037/',
      flat_name: 'threat.group.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.reference',
      normalize: [],
      short: 'Reference URL of the group.',
      type: 'keyword'
    }
  },
  indicator: {
    as: { number: [Object], organization: [Object] },
    confidence: {
      dashed_name: 'threat-indicator-confidence',
      description: 'Identifies the vendor-neutral confidence rating using the None/Low/Medium/High scale defined in Appendix A of the STIX 2.1 framework. Vendor-specific confidence scales may be added as custom fields.\n' +
        'Expected values are:\n' +
        '  * Not Specified\n' +
        '  * None\n' +
        '  * Low\n' +
        '  * Medium\n' +
        '  * High',
      example: 'Medium',
      flat_name: 'threat.indicator.confidence',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.confidence',
      normalize: [],
      short: 'Indicator confidence rating',
      type: 'keyword'
    },
    description: {
      dashed_name: 'threat-indicator-description',
      description: 'Describes the type of action conducted by the threat.',
      example: 'IP x.x.x.x was observed delivering the Angler EK.',
      flat_name: 'threat.indicator.description',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.description',
      normalize: [],
      short: 'Indicator description',
      type: 'keyword'
    },
    email: { address: [Object] },
    file: {
      accessed: [Object],
      attributes: [Object],
      code_signature: [Object],
      created: [Object],
      ctime: [Object],
      device: [Object],
      directory: [Object],
      drive_letter: [Object],
      elf: [Object],
      extension: [Object],
      fork_name: [Object],
      gid: [Object],
      group: [Object],
      hash: [Object],
      inode: [Object],
      mime_type: [Object],
      mode: [Object],
      mtime: [Object],
      name: [Object],
      owner: [Object],
      path: [Object],
      pe: [Object],
      size: [Object],
      target_path: [Object],
      type: [Object],
      uid: [Object],
      x509: [Object]
    },
    first_seen: {
      dashed_name: 'threat-indicator-first-seen',
      description: 'The date and time when intelligence source first reported sighting this indicator.',
      example: '2020-11-05T17:25:47.000Z',
      flat_name: 'threat.indicator.first_seen',
      level: 'extended',
      name: 'indicator.first_seen',
      normalize: [],
      short: 'Date/time indicator was first reported.',
      type: 'date'
    },
    geo: {
      city_name: [Object],
      continent_code: [Object],
      continent_name: [Object],
      country_iso_code: [Object],
      country_name: [Object],
      location: [Object],
      name: [Object],
      postal_code: [Object],
      region_iso_code: [Object],
      region_name: [Object],
      timezone: [Object]
    },
    ip: {
      dashed_name: 'threat-indicator-ip',
      description: 'Identifies a threat indicator as an IP address (irrespective of direction).',
      example: '1.2.3.4',
      flat_name: 'threat.indicator.ip',
      level: 'extended',
      name: 'indicator.ip',
      normalize: [],
      short: 'Indicator IP address',
      type: 'ip'
    },
    last_seen: {
      dashed_name: 'threat-indicator-last-seen',
      description: 'The date and time when intelligence source last reported sighting this indicator.',
      example: '2020-11-05T17:25:47.000Z',
      flat_name: 'threat.indicator.last_seen',
      level: 'extended',
      name: 'indicator.last_seen',
      normalize: [],
      short: 'Date/time indicator was last reported.',
      type: 'date'
    },
    marking: { tlp: [Object] },
    modified_at: {
      dashed_name: 'threat-indicator-modified-at',
      description: 'The date and time when intelligence source last modified information for this indicator.',
      example: '2020-11-05T17:25:47.000Z',
      flat_name: 'threat.indicator.modified_at',
      level: 'extended',
      name: 'indicator.modified_at',
      normalize: [],
      short: 'Date/time indicator was last updated.',
      type: 'date'
    },
    port: {
      dashed_name: 'threat-indicator-port',
      description: 'Identifies a threat indicator as a port number (irrespective of direction).',
      example: 443,
      flat_name: 'threat.indicator.port',
      level: 'extended',
      name: 'indicator.port',
      normalize: [],
      short: 'Indicator port',
      type: 'long'
    },
    provider: {
      dashed_name: 'threat-indicator-provider',
      description: "The name of the indicator's provider.",
      example: 'lrz_urlhaus',
      flat_name: 'threat.indicator.provider',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.provider',
      normalize: [],
      short: 'Indicator provider',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-indicator-reference',
      description: 'Reference URL linking to additional information about this indicator.',
      example: 'https://system.example.com/indicator/0001234',
      flat_name: 'threat.indicator.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.reference',
      normalize: [],
      short: 'Indicator reference URL',
      type: 'keyword'
    },
    registry: {
      data: [Object],
      hive: [Object],
      key: [Object],
      path: [Object],
      value: [Object]
    },
    scanner_stats: {
      dashed_name: 'threat-indicator-scanner-stats',
      description: 'Count of AV/EDR vendors that successfully detected malicious file or URL.',
      example: 4,
      flat_name: 'threat.indicator.scanner_stats',
      level: 'extended',
      name: 'indicator.scanner_stats',
      normalize: [],
      short: 'Scanner statistics',
      type: 'long'
    },
    sightings: {
      dashed_name: 'threat-indicator-sightings',
      description: 'Number of times this indicator was observed conducting threat activity.',
      example: 20,
      flat_name: 'threat.indicator.sightings',
      level: 'extended',
      name: 'indicator.sightings',
      normalize: [],
      short: 'Number of times indicator observed',
      type: 'long'
    },
    type: {
      dashed_name: 'threat-indicator-type',
      description: 'Type of indicator as represented by Cyber Observable in STIX 2.0.\n' +
        'Recommended values:\n' +
        '  * autonomous-system\n' +
        '  * artifact\n' +
        '  * directory\n' +
        '  * domain-name\n' +
        '  * email-addr\n' +
        '  * file\n' +
        '  * ipv4-addr\n' +
        '  * ipv6-addr\n' +
        '  * mac-addr\n' +
        '  * mutex\n' +
        '  * port\n' +
        '  * process\n' +
        '  * software\n' +
        '  * url\n' +
        '  * user-account\n' +
        '  * windows-registry-key\n' +
        '  * x509-certificate',
      example: 'ipv4-addr',
      flat_name: 'threat.indicator.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.type',
      normalize: [],
      short: 'Type of indicator',
      type: 'keyword'
    },
    url: {
      domain: [Object],
      extension: [Object],
      fragment: [Object],
      full: [Object],
      original: [Object],
      password: [Object],
      path: [Object],
      port: [Object],
      query: [Object],
      registered_domain: [Object],
      scheme: [Object],
      subdomain: [Object],
      top_level_domain: [Object],
      username: [Object]
    },
    x509: {
      alternative_names: [Object],
      issuer: [Object],
      not_after: [Object],
      not_before: [Object],
      public_key_algorithm: [Object],
      public_key_curve: [Object],
      public_key_exponent: [Object],
      public_key_size: [Object],
      serial_number: [Object],
      signature_algorithm: [Object],
      subject: [Object],
      version_number: [Object]
    }
  },
  software: {
    alias: {
      dashed_name: 'threat-software-alias',
      description: 'The alias(es) of the software for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® associated software description.',
      example: '[ "X-Agent" ]',
      flat_name: 'threat.software.alias',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.alias',
      normalize: [Array],
      short: 'Alias of the software',
      type: 'keyword'
    },
    id: {
      dashed_name: 'threat-software-id',
      description: 'The id of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'While not required, you can use a MITRE ATT&CK® software id.',
      example: 'S0552',
      flat_name: 'threat.software.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.id',
      normalize: [],
      short: 'ID of the software',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-software-name',
      description: 'The name of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'While not required, you can use a MITRE ATT&CK® software name.',
      example: 'AdFind',
      flat_name: 'threat.software.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.name',
      normalize: [],
      short: 'Name of the software.',
      type: 'keyword'
    },
    platforms: {
      dashed_name: 'threat-software-platforms',
      description: 'The platforms of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'Recommended Values:\n' +
        '  * AWS\n' +
        '  * Azure\n' +
        '  * Azure AD\n' +
        '  * GCP\n' +
        '  * Linux\n' +
        '  * macOS\n' +
        '  * Network\n' +
        '  * Office 365\n' +
        '  * SaaS\n' +
        '  * Windows\n' +
        '\n' +
        'While not required, you can use a MITRE ATT&CK® software platforms.',
      example: '[ "Windows" ]',
      flat_name: 'threat.software.platforms',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.platforms',
      normalize: [Array],
      short: 'Platforms of the software.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-software-reference',
      description: 'The reference URL of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'While not required, you can use a MITRE ATT&CK® software reference URL.',
      example: 'https://attack.mitre.org/software/S0552/',
      flat_name: 'threat.software.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.reference',
      normalize: [],
      short: 'Software reference URL.',
      type: 'keyword'
    },
    type: {
      dashed_name: 'threat-software-type',
      description: 'The type of software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'Recommended values\n' +
        '  * Malware\n' +
        '  * Tool\n' +
        '\n' +
        ' While not required, you can use a MITRE ATT&CK® software type.',
      example: 'Tool',
      flat_name: 'threat.software.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.type',
      normalize: [],
      short: 'Software type.',
      type: 'keyword'
    }
  },
  tactic: {
    id: {
      dashed_name: 'threat-tactic-id',
      description: 'The id of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/ )',
      example: 'TA0002',
      flat_name: 'threat.tactic.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'tactic.id',
      normalize: [Array],
      short: 'Threat tactic id.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-tactic-name',
      description: 'Name of the type of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/)',
      example: 'Execution',
      flat_name: 'threat.tactic.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'tactic.name',
      normalize: [Array],
      short: 'Threat tactic.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-tactic-reference',
      description: 'The reference url of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/ )',
      example: 'https://attack.mitre.org/tactics/TA0002/',
      flat_name: 'threat.tactic.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'tactic.reference',
      normalize: [Array],
      short: 'Threat tactic URL reference.',
      type: 'keyword'
    }
  },
  technique: {
    id: {
      dashed_name: 'threat-technique-id',
      description: 'The id of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)',
      example: 'T1059',
      flat_name: 'threat.technique.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'technique.id',
      normalize: [Array],
      short: 'Threat technique id.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-technique-name',
      description: 'The name of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)',
      example: 'Command and Scripting Interpreter',
      flat_name: 'threat.technique.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'technique.name',
      normalize: [Array],
      short: 'Threat technique name.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-technique-reference',
      description: 'The reference url of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)',
      example: 'https://attack.mitre.org/techniques/T1059/',
      flat_name: 'threat.technique.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'technique.reference',
      normalize: [Array],
      short: 'Threat technique URL reference.',
      type: 'keyword'
    },
    subtechnique: { id: [Object], name: [Object], reference: [Object] }
  }
}