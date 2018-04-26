export const EDIT_CONFIG = {
  title: 'Edit the configuration',
  textPre:
    `If you're using an X-Pack secured version of Elastic Stack, you must specify` +
    ' credentials in the `apm-server.yml` config file.',
  commands: [
    'output.elasticsearch:',
    '    hosts: ["<es_url>"]',
    '    username: <username>',
    '    password: <password>',
  ],
};

const IMPORT_DASHBOARD = {
  title: 'Import dashboards',
  textPre: 'APM Server ships with preconfigured dashboards.',
};

const START_SERVER = {
  title: 'Start APM Server',
  textPre:
    'The server processes and stores application performance metrics in Elasticsearch.',
};

export const IMPORT_DASHBOARD_UNIX = {
  title: IMPORT_DASHBOARD.title,
  textPre: IMPORT_DASHBOARD.textPre,
  commands: ['./apm-server setup'],
};

export const START_SERVER_UNIX = {
  title: START_SERVER.title,
  textPre: START_SERVER.textPre,
  commands: ['./apm-server -e'],
};

const DOWNLOAD_SERVER_TITLE = 'Download and unpack APM Server';

export const DOWNLOAD_SERVER_OSX = {
  title: DOWNLOAD_SERVER_TITLE,
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-darwin-x86_64.tar.gz',
    'tar xzvf apm-server-{config.kibana.version}-darwin-x86_64.tar.gz',
    'cd apm-server-{config.kibana.version}-darwin-x86_64/',
  ],
};

export const DOWNLOAD_SERVER_DEB = {
  title: DOWNLOAD_SERVER_TITLE,
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-amd64.deb',
    'sudo dpkg -i apm-server-{config.kibana.version}-amd64.deb',
  ],
  textPost:
    'Looking for the 32-bit packages? See the [Download page]({config.docs.base_url}downloads/apm/apm-server).',
};

export const DOWNLOAD_SERVER_RPM = {
  title: DOWNLOAD_SERVER_TITLE,
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-x86_64.rpm',
    'sudo rpm -vi apm-server-{config.kibana.version}-x86_64.rpm',
  ],
  textPost:
    'Looking for the 32-bit packages? See the [Download page]({config.docs.base_url}downloads/apm/apm-server).',
};

export const WINDOWS_SERVER_INSTRUCTIONS = [
  {
    title: DOWNLOAD_SERVER_TITLE,
    textPre:
      '1. Download the APM Server Windows zip file from the [Download page](https://www.elastic.co/downloads/apm/apm-server).\n' +
      '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
      '3. Rename the `apm-server-{config.kibana.version}-windows` directory to `APM-Server`.\n' +
      '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
      ' **Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n' +
      '5. From the PowerShell prompt, run the following commands to install APM Server as a Windows service:',
    commands: [
      `PS > cd 'C:\\Program Files\\APM-Server'`,
      `PS C:\\Program Files\\APM-Server> .\\install-service-apm-server.ps1`,
    ],
    textPost:
      'Note: If script execution is disabled on your system, you need to set the execution policy for the current session' +
      ' to allow the script to run. For example: `PowerShell.exe -ExecutionPolicy UnRestricted -File .\\install-service-apm-server.ps1`.',
  },
  {
    title: IMPORT_DASHBOARD.title,
    textPre: IMPORT_DASHBOARD.textPre,
    commands: ['apm-server.exe setup'],
  },
  EDIT_CONFIG,
  {
    title: START_SERVER.title,
    textPre: START_SERVER.textPre,
    commands: ['apm-server.exe -e'],
  },
];
