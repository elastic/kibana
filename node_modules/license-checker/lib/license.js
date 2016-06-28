var MIT_LICENSE = /ermission is hereby granted, free of charge, to any/;
var BSD_LICENSE = /edistribution and use in source and binary forms, with or withou/;
var MIT = /MIT\b/;
var BSD = /BSD\b/;
var APACHE = /Apache License\b/;

module.exports = function(str) {
    if (str) {
        str = str.replace('\n', '');
    }
    if (typeof str === 'undefined' || !str) {
        return 'Undefined';
    } else if (MIT_LICENSE.test(str)) {
        return 'MIT*';
    } else if (BSD_LICENSE.test(str)) {
        return 'BSD*';
    } else if (MIT.test(str)) {
        return 'MIT*';
    } else if (BSD.test(str)) {
        return 'BSD*';
    } else if (APACHE.test(str)) {
        return 'Apache*';
    } else if (str.indexOf('DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE') > -1 || str.indexOf('WTFPL') > -1) {
        return 'WTF*';
    }
    return null;
};
