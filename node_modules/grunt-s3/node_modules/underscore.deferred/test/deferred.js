test("its should be part of Underscore", function() {
  ok( _.VERSION );
  equal( typeof _.Deferred, 'function' );
});

_.each( [ "", " - new operator" ], function( withNew ) {

  function createDeferred( fn ) {
    return withNew ? new _.Deferred( fn ) : _.Deferred( fn );
  }

  test("_.Deferred" + withNew, function() {

    expect( 22 );

    createDeferred().resolve().then( function() {
      ok( true , "Success on resolve" );
      ok( this.isResolved(), "Deferred is resolved" );
      strictEqual( this.state(), "resolved", "Deferred is resolved (state)" );
    }, function() {
      ok( false , "Error on resolve" );
    }).always( function() {
      ok( true , "Always callback on resolve" );
    });

    createDeferred().reject().then( function() {
      ok( false , "Success on reject" );
    }, function() {
      ok( true , "Error on reject" );
      ok( this.isRejected(), "Deferred is rejected" );
      strictEqual( this.state(), "rejected", "Deferred is rejected (state)" );
    }).always( function() {
      ok( true , "Always callback on reject" );
    });

    createDeferred( function( defer ) {
      ok( this === defer , "Defer passed as this & first argument" );
      this.resolve( "done" );
    }).then( function( value ) {
      strictEqual( value , "done" , "Passed function executed" );
    });

    _.each( "resolve reject".split( " " ), function( change ) {
      createDeferred( function( defer ) {
        strictEqual( defer.state(), "pending", "pending after creation" );
        var checked = 0;
        defer.progress(function( value ) {
          strictEqual( value, checked, "Progress: right value (" + value + ") received" );
        });
        for( checked = 0; checked < 3 ; checked++ ) {
          defer.notify( checked );
        }
        strictEqual( defer.state(), "pending", "pending after notification" );
        defer[ change ]();
        notStrictEqual( defer.state(), "pending", "not pending after " + change );
        defer.notify();
      });
    });
  });

} );


test( "_.Deferred - chainability", function() {

  var methods = "resolve reject notify resolveWith rejectWith notifyWith done fail progress then always".split( " " ),
    defer = _.Deferred();

  expect( methods.length );

  _.each( methods, function( method ) {
    var object = { m: defer[ method ] };
    strictEqual( object.m(), object, method + " is chainable" );
  });
});


test( "_.Deferred.pipe - filtering (done)", function() {

  expect(4);

  var defer = _.Deferred(),
    piped = defer.pipe(function( a, b ) {
      return a * b;
    }),
    value1,
    value2,
    value3;

  piped.done(function( result ) {
    value3 = result;
  });

  defer.done(function( a, b ) {
    value1 = a;
    value2 = b;
  });

  defer.resolve( 2, 3 );

  strictEqual( value1, 2, "first resolve value ok" );
  strictEqual( value2, 3, "second resolve value ok" );
  strictEqual( value3, 6, "result of filter ok" );

  _.Deferred().reject().pipe(function() {
    ok( false, "pipe should not be called on reject" );
  });

  _.Deferred().resolve().pipe( _.noop ).done(function( value ) {
    strictEqual( value, undefined, "pipe done callback can return undefined/null" );
  });
});

test( "_.Deferred.pipe - filtering (fail)", function() {

  expect(4);

  var defer = _.Deferred(),
    piped = defer.pipe( null, function( a, b ) {
      return a * b;
    } ),
    value1,
    value2,
    value3;

  piped.fail(function( result ) {
    value3 = result;
  });

  defer.fail(function( a, b ) {
    value1 = a;
    value2 = b;
  });

  defer.reject( 2, 3 );

  strictEqual( value1, 2, "first reject value ok" );
  strictEqual( value2, 3, "second reject value ok" );
  strictEqual( value3, 6, "result of filter ok" );

  _.Deferred().resolve().pipe( null, function() {
    ok( false, "pipe should not be called on resolve" );
  } );

  _.Deferred().reject().pipe( null, _.noop ).fail(function( value ) {
    strictEqual( value, undefined, "pipe fail callback can return undefined/null" );
  });
});

test( "_.Deferred.pipe - filtering (progress)", function() {

  expect(3);

  var defer = _.Deferred(),
    piped = defer.pipe( null, null, function( a, b ) {
      return a * b;
    } ),
    value1,
    value2,
    value3;

  piped.progress(function( result ) {
    value3 = result;
  });

  defer.progress(function( a, b ) {
    value1 = a;
    value2 = b;
  });

  defer.notify( 2, 3 );

  strictEqual( value1, 2, "first progress value ok" );
  strictEqual( value2, 3, "second progress value ok" );
  strictEqual( value3, 6, "result of filter ok" );
});

test( "_.Deferred.pipe - deferred (done)", function() {

  expect(3);

  var defer = _.Deferred(),
    piped = defer.pipe(function( a, b ) {
      return _.Deferred(function( defer ) {
        defer.reject( a * b );
      });
    }),
    value1,
    value2,
    value3;

  piped.fail(function( result ) {
    value3 = result;
  });

  defer.done(function( a, b ) {
    value1 = a;
    value2 = b;
  });

  defer.resolve( 2, 3 );

  strictEqual( value1, 2, "first resolve value ok" );
  strictEqual( value2, 3, "second resolve value ok" );
  strictEqual( value3, 6, "result of filter ok" );
});

test( "_.Deferred.pipe - deferred (fail)", function() {

  expect(3);

  var defer = _.Deferred(),
    piped = defer.pipe( null, function( a, b ) {
      return _.Deferred(function( defer ) {
        defer.resolve( a * b );
      });
    } ),
    value1,
    value2,
    value3;

  piped.done(function( result ) {
    value3 = result;
  });

  defer.fail(function( a, b ) {
    value1 = a;
    value2 = b;
  });

  defer.reject( 2, 3 );

  strictEqual( value1, 2, "first reject value ok" );
  strictEqual( value2, 3, "second reject value ok" );
  strictEqual( value3, 6, "result of filter ok" );
});

test( "_.Deferred.pipe - deferred (progress)", function() {

  expect(3);

  var defer = _.Deferred(),
    piped = defer.pipe( null, null, function( a, b ) {
      return _.Deferred(function( defer ) {
        defer.resolve( a * b );
      });
    } ),
    value1,
    value2,
    value3;

  piped.done(function( result ) {
    value3 = result;
  });

  defer.progress(function( a, b ) {
    value1 = a;
    value2 = b;
  });

  defer.notify( 2, 3 );

  strictEqual( value1, 2, "first progress value ok" );
  strictEqual( value2, 3, "second progress value ok" );
  strictEqual( value3, 6, "result of filter ok" );
});

test( "_.Deferred.pipe - context", function() {

  expect(4);

  var context = {};

  _.Deferred().resolveWith( context, [ 2 ] ).pipe(function( value ) {
    return value * 3;
  }).done(function( value ) {
    strictEqual( this, context, "custom context correctly propagated" );
    strictEqual( value, 6, "proper value received" );
  });

  var defer = _.Deferred(),
    piped = defer.pipe(function( value ) {
      return value * 3;
    });

  defer.resolve( 2 );

  piped.done(function( value ) {
    strictEqual( this.promise(), piped, "default context gets updated to latest defer in the chain" );
    strictEqual( value, 6, "proper value received" );
  });
});

test( "_.when" , function() {

  expect( 23 );

  // Some other objects
  _.each( {

    "an empty string": "",
    "a non-empty string": "some string",
    "zero": 0,
    "a number other than zero": 1,
    "true": true,
    "false": false,
    "null": null,
    "undefined": undefined,
    "a plain object": {}

  } , function(  value, message ) {

    ok( _.isFunction( _.when( value ).done(function( resolveValue ) {
      strictEqual( resolveValue , value , "Test the promise was resolved with " + message );
    }).promise ) , "Test " + message + " triggers the creation of a new Promise" );

  } );

  ok( _.isFunction( _.when().done(function( resolveValue ) {
    strictEqual( resolveValue , undefined , "Test the promise was resolved with no parameter" );
  }).promise ) , "Test calling when with no parameter triggers the creation of a new Promise" );

  var cache, i;

  for( i = 1 ; i < 4 ; i++ ) {
    _.when( cache || _.Deferred( function() {
      this.resolve( i );
    }) ).done(function( value ) {
      strictEqual( value , 1 , "Function executed" + ( i > 1 ? " only once" : "" ) );
      cache = value;
    });
  }
});

test("_.when - joined", function() {

  expect(53);

  var deferreds = {
      value: 1,
      success: _.Deferred().resolve( 1 ),
      error: _.Deferred().reject( 0 ),
      futureSuccess: _.Deferred().notify( true ),
      futureError: _.Deferred().notify( true ),
      notify: _.Deferred().notify( true )
    },
    willSucceed = {
      value: true,
      success: true,
      futureSuccess: true
    },
    willError = {
      error: true,
      futureError: true
    },
    willNotify = {
      futureSuccess: true,
      futureError: true,
      notify: true
    };

  _.each( deferreds, function( defer1, id1 ) {
    _.each( deferreds, function( defer2, id2 ) {
      var shouldResolve = willSucceed[ id1 ] && willSucceed[ id2 ],
        shouldError = willError[ id1 ] || willError[ id2 ],
        shouldNotify = willNotify[ id1 ] || willNotify[ id2 ],
        expected = shouldResolve ? [ 1, 1 ] : [ 0, undefined ],
          expectedNotify = shouldNotify && [ willNotify[ id1 ], willNotify[ id2 ] ],
          code = id1 + "/" + id2;

      var promise = _.when( defer1, defer2 ).done(function( a, b ) {
        if ( shouldResolve ) {
          deepEqual( [ a, b ], expected, code + " => resolve" );
        } else {
          ok( false ,  code + " => resolve" );
        }
      }).fail(function( a, b ) {
        if ( shouldError ) {
          deepEqual( [ a, b ], expected, code + " => reject" );
        } else {
          ok( false ,  code + " => reject" );
        }
      }).progress(function progress( a, b ) {
        deepEqual( [ a, b ], expectedNotify, code + " => progress" );
      });
    } );
  } );
  deferreds.futureSuccess.resolve( 1 );
  deferreds.futureError.reject( 0 );
});


(function() {

var output,
  addToOutput = function( string ) {
    return function() {
      output += string;
    };
  },
  outputA = addToOutput( "A" ),
  outputB = addToOutput( "B" ),
  outputC = addToOutput( "C" ),
  tests = {
    "":             "XABC   X   XABCABCC  X   XBB X XABA  X",
    "once":           "XABC   X     X       X   X   X XABA  X",
    "memory":         "XABC   XABC  XABCABCCC   XA  XBB XB  XABA  XC",
    "unique":         "XABC   X   XABCA   X XBB X XAB   X",
    "stopOnFalse":        "XABC   X   XABCABCC  X XBB X XA    X",
    "once memory":        "XABC   XABC  X     XA  X XA  XABA  XC",
    "once unique":        "XABC   X   X     X X X XAB   X",
    "once stopOnFalse":     "XABC   X   X     X X X XA    X",
    "memory unique":      "XABC   XA    XABCA   XA  XBB XB  XAB   XC",
    "memory stopOnFalse":   "XABC   XABC  XABCABCCC XA  XBB XB  XA    X",
    "unique stopOnFalse":   "XABC   X   XABCA   X XBB X XA    X"
  },
  filters = {
    "no filter": undefined,
    "filter": function( fn ) {
      return function() {
        return fn.apply( this, arguments );
      };
    }
  };

_.each( tests, function( resultString, flags ) {

  _.each( filters, function( filter, filterLabel ) {

    test( "_.Callbacks( \"" + flags + "\" ) - " + filterLabel, function() {

      expect( 20 );

      // Give qunit a little breathing room
      stop();
      setTimeout( start, 0 );

      var cblist;
        results = resultString.split( /\s+/ );

      // Basic binding and firing
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add(function( str ) {
        output += str;
      });
      cblist.fire( "A" );
      strictEqual( output, "XA", "Basic binding and firing" );
      strictEqual( cblist.fired(), true, ".fired() detects firing" );
      output = "X";
      cblist.disable();
      cblist.add(function( str ) {
        output += str;
      });
      strictEqual( output, "X", "Adding a callback after disabling" );
      cblist.fire( "A" );
      strictEqual( output, "X", "Firing after disabling" );

      // Basic binding and firing (context, arguments)
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add(function() {
        equal( this, window, "Basic binding and firing (context)" );
        output += Array.prototype.join.call( arguments, "" );
      });
      cblist.fireWith( window, [ "A", "B" ] );
      strictEqual( output, "XAB", "Basic binding and firing (arguments)" );

      // fireWith with no arguments
      output = "";
      cblist = _.Callbacks( flags );
      cblist.add(function() {
        equal( this, window, "fireWith with no arguments (context is window)" );
        strictEqual( arguments.length, 0, "fireWith with no arguments (no arguments)" );
      });
      cblist.fireWith();

      // Basic binding, removing and firing
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add( outputA, outputB, outputC );
      cblist.remove( outputB, outputC );
      cblist.fire();
      strictEqual( output, "XA", "Basic binding, removing and firing" );

      // Empty
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add( outputA );
      cblist.add( outputB );
      cblist.add( outputC );
      cblist.empty();
      cblist.fire();
      strictEqual( output, "X", "Empty" );

      // Locking
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add( function( str ) {
        output += str;
      });
      cblist.lock();
      cblist.add( function( str ) {
        output += str;
      });
      cblist.fire( "A" );
      cblist.add( function( str ) {
        output += str;
      });
      strictEqual( output, "X", "Lock early" );

      // Ordering
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add( function() {
        cblist.add( outputC );
        outputA();
      }, outputB );
      cblist.fire();
      strictEqual( output, results.shift(), "Proper ordering" );

      // Add and fire again
      output = "X";
      cblist.add( function() {
        cblist.add( outputC );
        outputA();
      }, outputB );
      strictEqual( output, results.shift(), "Add after fire" );

      output = "X";
      cblist.fire();
      strictEqual( output, results.shift(), "Fire again" );

      // Multiple fire
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add( function( str ) {
        output += str;
      } );
      cblist.fire( "A" );
      strictEqual( output, "XA", "Multiple fire (first fire)" );
      output = "X";
      cblist.add( function( str ) {
        output += str;
      } );
      strictEqual( output, results.shift(), "Multiple fire (first new callback)" );
      output = "X";
      cblist.fire( "B" );
      strictEqual( output, results.shift(), "Multiple fire (second fire)" );
      output = "X";
      cblist.add( function( str ) {
        output += str;
      } );
      strictEqual( output, results.shift(), "Multiple fire (second new callback)" );

      // Return false
      output = "X";
      cblist = _.Callbacks( flags );
      cblist.add( outputA, function() { return false; }, outputB );
      cblist.add( outputA );
      cblist.fire();
      strictEqual( output, results.shift(), "Callback returning false" );

      // Add another callback (to control lists with memory do not fire anymore)
      output = "X";
      cblist.add( outputC );
      strictEqual( output, results.shift(), "Adding a callback after one returned false" );

    });
  });
});

})();
