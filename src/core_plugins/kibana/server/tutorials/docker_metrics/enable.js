export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the docker module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable docker',
    ],
    textPost: 'Modify the settings in the `modules.d/docker.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the docker module',
    commands: [
      'sudo metricbeat modules enable docker',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/docker.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the docker module',
    commands: [
      'sudo metricbeat modules enable docker',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/docker.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the docker module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable docker',
    ],
    textPost: 'Modify the settings in the `modules.d/docker.yml` file.'
  }
};
