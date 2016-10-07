export default function (kbnServer, server, config) {
  config.setDeprecationLogger((msg) => {
    server.log(['warning', 'config', 'deprecation'], msg);
  });
};
