define(function () {
  'use strict';
  return function (indices) {
    // Use the first index from the indices and return the constructed url
    var index =  indices.shift();
    return '/'+index+'/cluster_state/_search';
  };  
});
