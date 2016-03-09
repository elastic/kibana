export default function (server) {
  require('./register_post')(server);
  require('./register_delete')(server);
  require('./register_simulate')(server);
}
