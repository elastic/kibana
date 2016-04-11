export default function (server) {
  require('./register_get')(server);
  require('./register_set')(server);
  require('./register_delete')(server);
}
