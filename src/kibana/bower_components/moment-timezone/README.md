moment-timezone
===============

[![Build Status](https://travis-ci.org/moment/moment-timezone.png)](https://travis-ci.org/moment/moment-timezone)

Timezone information for moment.js.

## After cloning repo

```
git submodule update --init
```

## Updating timezone info

```
git submodule update

sudo zic tz/africa
sudo zic tz/antarctica
sudo zic tz/asia
sudo zic tz/australasia
sudo zic tz/europe
sudo zic tz/northamerica
sudo zic tz/southamerica

grunt zdump
grunt zones

grunt test
```

## changelog

### 0.0.6
* fix double loading issue introduced in 0.0.5

### 0.0.5
* [#39](https://github.com/moment/moment-timezone/issues/39) improve performance with memoize
* [#46](https://github.com/moment/moment-timezone/issues/46) publish only necessary files to npm
* [#53](https://github.com/moment/moment-timezone/issues/53), [#61](https://github.com/moment/moment-timezone/issues/61), [#70](https://github.com/moment/moment-timezone/issues/70), better handling of timezones around DST
* [#41](https://github.com/moment/moment-timezone/issues/41) support browserify
* [#71](https://github.com/moment/moment-timezone/issues/71) fix cloning zone-d moments
* [#73](https://github.com/moment/moment-timezone/issues/73) add moment.tz.zoneExists method
* [#74](https://github.com/moment/moment-timezone/issues/74) prevent double loading

### 0.0.3
* added bower support
* support newer versions of moment
* construction with string and zone respects zone
* added more links and timezone names in moment-timezone.json
