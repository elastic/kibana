module.exports = function (filename) {
  return filename.match(/.*\/src\/.*\.js$/)
    && !filename.match(/.*\/src\/kibana\/bower_components\/.*\.js$/)
    && !filename.match(/.*\/src\/kibana\/utils\/(event_emitter|rison)\.js$/);
};
