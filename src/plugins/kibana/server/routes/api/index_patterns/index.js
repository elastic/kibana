export default function (server) {
  require('./register_get')(server);
  require('./register_post')(server);
  require('./register_put')(server);
  require('./register_delete')(server);
}
