// Run upstream tests against our promisified version

var rewire = require("rewire");

// Support upstream's hand-rolled test cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var test;
test = rewire("supertest/test/supertest");
test.__set__("request", require(".."));
