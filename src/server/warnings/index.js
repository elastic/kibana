export default function (kbnServer, server, config) {
  process.on('warning', (warning) => {
    server.log(['warning', 'process'], warning);
  });
}
