var haveGetters = (function(){
    try {
        var o ={};

        if( Object.__defineGetter__ ) {
            o.__defineGetter__( "fn", function(){
                return 3;
            });
            return o.fn === 3;
        }
        else if( Object.defineProperty ) {
            Object.defineProperty(o, "fn", {get: function(){return 3}});
            return o.fn === 3;
        }
        return false;
    }
    catch(e) {
        return false;
    }
})();
