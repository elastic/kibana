export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the mysql module',
    textPre: 'From the installation directory, run:',
    commands: [
      './filebeat modules enable mysql',
    ],
    textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the mysql module',
    commands: [
      'sudo filebeat modules enable mysql',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the mysql module',
    commands: [
      'sudo filebeat modules enable mysql',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the mysql module',
    textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable mysql',
    ],
    textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
  }
};
