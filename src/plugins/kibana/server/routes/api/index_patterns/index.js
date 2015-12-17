export default function (server) {

  const cache = server.cache({ segment: 'index-patterns', expiresIn: 60 * 1000 });

  require('./register_get')(server, cache);
  require('./register_post')(server);
  require('./register_put')(server, cache);
  require('./register_delete')(server, cache);
}
