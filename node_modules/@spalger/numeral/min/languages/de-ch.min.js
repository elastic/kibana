/*! 
 * numeral.js language configuration
 * language : German in Switzerland (de-ch)
 * author : Michael Piefel : https://github.com/piefel (based on work from Marco Krage : https://github.com/sinky)
 */
!function(){var a={delimiters:{thousands:" ",decimal:","},abbreviations:{thousand:"k",million:"m",billion:"b",trillion:"t"},ordinal:function(){return"."},currency:{symbol:"CHF"}};"undefined"!=typeof module&&module.exports&&(module.exports=a),"undefined"!=typeof window&&this.numeral&&this.numeral.language&&this.numeral.language("de-ch",a)}();