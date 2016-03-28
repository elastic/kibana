# Change Log

## 1.9.0

### Added

- Add more output for "bodies don't match" (Hidenari Nozaki) - https://github.com/pgte/nock/pull/312


## 1.8.0

### Added

- feature: fail when specified bad header is present (Ken Sheeldo) - https://github.com/pgte/nock/pull/310


## 1.7.1

### Fixed

- removing interceptors when replying with error (Pedro Teixeira) - #307
- reply status code must always be a number (Pedro Teixeira) - #308


## 1.7.0

### Added

- access request headers from within the reply callback (Pedro Teixeira)


## 1.6.0

### Added

- Mocking Network Errors (Douglas Eggleton) - https://github.com/pgte/nock/pull/298

## 1.5.0

### Added

- fully dynamic replies using one function (Pedro Teixeira) - https://github.com/pgte/nock/pull/297

## 1.4.0

### Added

- setting 404 as status code in no match errors to help some server defaults (Pedro Teixeira)

## 1.3.0

### Added

- add syntax sugar for basic auth (José F. Romaniello) - https://github.com/pgte/nock/pull/293


## 1.2.1

### Fixed
- Reset file read stream after first request (Benjamin Urban) - https://github.com/pgte/nock/pull/286


## 1.2.0

### Added
- reply with asynchronous response (Rémy HUBSCHER) - https://github.com/pgte/nock/pull/283
- simulate socket timout (Brett Porter) - https://github.com/pgte/nock/pull/282
- Show path in NetConnectNotAllowedError (Matt Olson) - https://github.com/pgte/nock/pull/284
