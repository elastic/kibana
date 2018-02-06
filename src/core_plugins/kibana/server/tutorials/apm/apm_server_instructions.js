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
    textPre: '1. Download the APM Server Windows zip file from the [Download page](https://www.elastic.co/downloads/apm/apm-server).\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `apm-server-6.2-windows` directory to `APM-Server`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' **Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n' +
               '5. From the PowerShell prompt, run the following commands to install APM Server as a Windows service:',
    commands: [
      `PS > cd 'C:\\Program Files\\APM-Server'`,
      `PS C:\\Program Files\\APM-Server> .\\install-service-apm-server.ps1`
    ],
    textPost: 'Note: If script execution is disabled on your system, you need to set the execution policy for the current session' +
      ' to allow the script to run. For example: `PowerShell.exe -ExecutionPolicy UnRestricted -File .\\install-service-apm-server.ps1`.'
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
