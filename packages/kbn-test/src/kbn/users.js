const env = process.env;

export const kibanaTestUser = {
  username: env.TEST_KIBANA_USER || 'elastic',
  password: env.TEST_KIBANA_PASS || 'changeme',
};

export const kibanaServerTestUser = {
  username: env.TEST_KIBANA_SERVER_USER || 'kibana',
  password: env.TEST_KIBANA_SERVER_PASS || 'changeme',
};

export const adminTestUser = {
  username: env.TEST_ES_USER || 'elastic',
  password: env.TEST_ES_PASS || 'changeme',
};
