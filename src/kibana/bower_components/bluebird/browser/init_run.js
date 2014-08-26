(function(tests){


    function requiresGetters(test) {
        //AP2 requires real getters
        //it's mostly about staying robust in the face
        //of evil getters anyway.
        return /2\.\d+\.\d+/.test(test.name) ||
            //requires real getters too
            test.name.indexOf("promises_unwrapping") > -1;
    }

    for( var i = 0, len = tests.length; i < len; ++i ) {
        var test = tests[i];
        if( !haveGetters && requiresGetters( test ) ) {
            continue;
        }
        test.fn();
    }

})(tests);
