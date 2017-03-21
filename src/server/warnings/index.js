export default function (kbnServer, server) {
  process.on('warning', (warning) => {
    server.log(['warning', 'process'], warning);
  });
}
