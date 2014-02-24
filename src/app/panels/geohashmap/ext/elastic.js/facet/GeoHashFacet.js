/**
 * Extention for elastic.js.
 * Add a facet for geohash required by geohash-facet plugin.
 */
  ejs.GeoHashFacet = function ( name ) {

    var facet = { };

    return {

      /**
       */
      field: function ( pField ) {

        facet[ name ] = {
          "geohash" : {
            "field" : pField,
            "factor" : 0.75
          }
        };

        return this;
      },

      toString: function () {
              return JSON.stringify(facet);
      },


      _type: function () {
              return 'facet';
        },

        _self: function () {
          return facet;
        }

    };
  };