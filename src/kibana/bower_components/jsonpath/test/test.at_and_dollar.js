var jsonpath = require("../").eval
  , testCase = require('nodeunit').testCase


var t1 = {
  simpleString: "simpleString",
  "@" : "@asPropertyName",
  "$" : "$asPropertyName",
  "a$a": "$inPropertyName",
  "$": {
    "@": "withboth",
  },
  a: {
    b: {
      c: "food"
    }
  }
};
  

module.exports = testCase({
    

    // ============================================================================    
    "test undefined, null": function(test) {
    // ============================================================================    
        test.expect(5);
        test.equal(undefined, jsonpath(undefined, "foo"));
        test.equal(null, jsonpath(null, "foo"));
        test.equal(undefined, jsonpath({}, "foo")[0]);
        test.equal(undefined, jsonpath({ a: "b" }, "foo")[0]);
        test.equal(undefined, jsonpath({ a: "b" }, "foo")[100]);
        test.done();
    },

    
    // ============================================================================    
    "test $ and @": function(test) {
    // ============================================================================    
        test.expect(7);
        test.equal(t1["$"],   jsonpath(t1, "\$")[0]);
        test.equal(t1["$"],   jsonpath(t1, "$")[0]);
        test.equal(t1["a$a"], jsonpath(t1, "a$a")[0]);
        test.equal(t1["@"],   jsonpath(t1, "\@")[0]);
        test.equal(t1["@"],   jsonpath(t1, "@")[0]);
        test.equal(t1["$"]["@"], jsonpath(t1, "$.$.@")[0]);
        test.equal(undefined, jsonpath(t1, "\@")[1]);
        
        test.done();
    }
    
});


