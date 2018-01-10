export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the nginx module',
    textPre: 'From the installation directory, run:',
    commands: [
      './filebeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the nginx module',
    commands: [
      'sudo filebeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/nginx.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the nginx module',
    commands: [
      'sudo filebeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/nginx.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the nginx module',
    textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable nginx',
    ],
    textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
  }
};
