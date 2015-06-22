/**
 * angular-strap
 * @version v2.1.6 - 2015-01-11
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
"use strict";angular.module("mgcrea.ngStrap.helpers.dateFormatter",[]).service("$dateFormatter",["$locale","dateFilter",function(t,e){function r(t){return/(h+)([:\.])?(m+)[ ]?(a?)/i.exec(t).slice(1)}this.getDefaultLocale=function(){return t.id},this.getDatetimeFormat=function(e){return t.DATETIME_FORMATS[e]||e},this.weekdaysShort=function(){return t.DATETIME_FORMATS.SHORTDAY},this.hoursFormat=function(t){return r(t)[0]},this.minutesFormat=function(t){return r(t)[2]},this.timeSeparator=function(t){return r(t)[1]},this.showAM=function(t){return!!r(t)[3]},this.formatDate=function(t,r){return e(t,r)}}]);
//# sourceMappingURL=date-formatter.min.js.map