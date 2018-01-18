const EDIT_CONFIG = {
  title: 'Edit the configuration',
  textPre: `If you're using an X-Pack secured version of Elastic Stack, you must specify` +
    ' credentials in the `apm-server.yml` config file.',
  commands: [
    'output.elasticsearch:',
    '    hosts: ["<es_url>"]',
    '    username: <username>',
    '    password: <password>'
  ]
};

const IMPORT_DASHBOARD = {
  title: 'Import dashboards',
  textPre: 'APM Server ships with preconfigured dashboards.'
};

const START_SERVER = {
  title: 'Start APM Server',
  textPre: 'The server processes and stores application performance metrics in Elasticsearch.'
};

export const DOWNLOAD_SERVER = {
  title: 'Download and unpack APM Server',
};

export const UNIX_FAMILY_SERVER_INSTRUCTIONS = [
  {
    ...IMPORT_DASHBOARD,
    commands: [
      './apm-server setup'
    ]
  },
  EDIT_CONFIG,
  {
    ...START_SERVER,
    commands: [
      './apm-server -e'
    ]
  }
];

export const WINDOWS_SERVER_INSTRUCTIONS = [
  {
    ...DOWNLOAD_SERVER,
    commands: [
      'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-6.2.0-windows-x86_64.zip',
      'sudo dpkg -i apm-server-6.2.0-windows-x86_64.zip'
    ],
    textPost: 'Looking for the 32-bit packages? See the [Download page]({config.docs.base_url}downloads/apm/apm-server).'
  },
  {
    ...IMPORT_DASHBOARD,
    commands: [
      'apm-server.exe setup'
    ]
  },
  EDIT_CONFIG,
  {
    ...START_SERVER,
    commands: [
      'apm-server.exe -e'
    ]
  }
];
