export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the system module',
    textPre: 'From the installation directory, run:',
    commands: [
      './filebeat modules enable system',
    ],
    textPost: 'Modify the settings in the `modules.d/system.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the system module',
    commands: [
      'sudo filebeat modules enable system',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/system.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the system module',
    commands: [
      'sudo filebeat modules enable system',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/system.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the system module',
    textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable system',
    ],
    textPost: 'Modify the settings in the `modules.d/system.yml` file.'
  }
};
