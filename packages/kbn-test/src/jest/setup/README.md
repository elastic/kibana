Setup procedure for the different Jest environments

1. JSDOM
   
  This is the environment that the default Jest preset uses, it includes setup for any browser mocking, react testing libraries, UI related stuff

2. Integration

  This is the environment the default Integration tests use, it only includes polyfills needed for Node.js and a modification to the test timeout

3. Integration JSDOM

  This is the environment the jest_integration_jsdom preset uses, it includes everything from the JSDOM and Integration environments


Each environment has a "setup" and "after env" file, which is required by Jest at different parts of the setup lifecycle, checkout the Jest docs for details.