const nativeControllerPath = process.argv[2];
require('../../babel-register');
require(nativeControllerPath);
