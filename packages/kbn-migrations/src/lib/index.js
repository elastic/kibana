module.exports = {
  ...require('./migration_context'),
  ...require('./persistence'),
  ...require('./migration_state'),
  ...require('./plugins'),
};
