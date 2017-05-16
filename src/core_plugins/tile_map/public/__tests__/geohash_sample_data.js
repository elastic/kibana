const sampleData = `{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-84.81215765699744, 36.289477944374084]},
    "properties": {
      "geohash": "dn",
      "value": 1418,
      "aggConfigResult": {
        "key": 1418,
        "value": 1418,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dn",
          "value": "dn",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 4,
          "type": "bucket"
        },
        "$order": 5,
        "type": "metric"
      },
      "center": [36.5625, -84.375],
      "rectangle": [[33.75, -90], [33.75, -78.75], [39.375, -78.75], [39.375, -90]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-84.8004243336618, 41.63311270996928]},
    "properties": {
      "geohash": "dp",
      "value": 1383,
      "aggConfigResult": {
        "key": 1383,
        "value": 1383,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dp",
          "value": "dp",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 7,
          "type": "bucket"
        },
        "$order": 8,
        "type": "metric"
      },
      "center": [42.1875, -84.375],
      "rectangle": [[39.375, -90], [39.375, -78.75], [45, -78.75], [45, -90]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-95.20564651116729, 36.4947619009763]},
    "properties": {
      "geohash": "9y",
      "value": 1219,
      "aggConfigResult": {
        "key": 1219,
        "value": 1219,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9y",
          "value": "9y",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 10,
          "type": "bucket"
        },
        "$order": 11,
        "type": "metric"
      },
      "center": [36.5625, -95.625],
      "rectangle": [[33.75, -101.25], [33.75, -90], [39.375, -90], [39.375, -101.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-73.8917376101017, 42.086046701297164]},
    "properties": {
      "geohash": "dr",
      "value": 1076,
      "aggConfigResult": {
        "key": 1076,
        "value": 1076,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dr",
          "value": "dr",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 13,
          "type": "bucket"
        },
        "$order": 14,
        "type": "metric"
      },
      "center": [42.1875, -73.125],
      "rectangle": [[39.375, -78.75], [39.375, -67.5], [45, -67.5], [45, -78.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-94.9999794177711, 42.19089978374541]},
    "properties": {
      "geohash": "9z",
      "value": 1047,
      "aggConfigResult": {
        "key": 1047,
        "value": 1047,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9z",
          "value": "9z",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 16,
          "type": "bucket"
        },
        "$order": 17,
        "type": "metric"
      },
      "center": [42.1875, -95.625],
      "rectangle": [[39.375, -101.25], [39.375, -90], [45, -90], [45, -101.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-84.72070790827274, 31.68308235704899]},
    "properties": {
      "geohash": "dj",
      "value": 972,
      "aggConfigResult": {
        "key": 972,
        "value": 972,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dj",
          "value": "dj",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 19,
          "type": "bucket"
        },
        "$order": 20,
        "type": "metric"
      },
      "center": [30.9375, -84.375],
      "rectangle": [[28.125, -90], [28.125, -78.75], [33.75, -78.75], [33.75, -90]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-95.22422080859542, 31.44715240225196]},
    "properties": {
      "geohash": "9v",
      "value": 950,
      "aggConfigResult": {
        "key": 950,
        "value": 950,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9v",
          "value": "9v",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 22,
          "type": "bucket"
        },
        "$order": 23,
        "type": "metric"
      },
      "center": [30.9375, -95.625],
      "rectangle": [[28.125, -101.25], [28.125, -90], [33.75, -90], [33.75, -101.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-119.02438038960099, 36.617594081908464]},
    "properties": {
      "geohash": "9q",
      "value": 751,
      "aggConfigResult": {
        "key": 751,
        "value": 751,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9q",
          "value": "9q",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 25,
          "type": "bucket"
        },
        "$order": 26,
        "type": "metric"
      },
      "center": [36.5625, -118.125],
      "rectangle": [[33.75, -123.75], [33.75, -112.5], [39.375, -112.5], [39.375, -123.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-106.54198246076703, 36.47509602829814]},
    "properties": {
      "geohash": "9w",
      "value": 516,
      "aggConfigResult": {
        "key": 516,
        "value": 516,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9w",
          "value": "9w",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 28,
          "type": "bucket"
        },
        "$order": 29,
        "type": "metric"
      },
      "center": [36.5625, -106.875],
      "rectangle": [[33.75, -112.5], [33.75, -101.25], [39.375, -101.25], [39.375, -112.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-119.28373273462057, 47.07595920190215]},
    "properties": {
      "geohash": "c2",
      "value": 497,
      "aggConfigResult": {
        "key": 497,
        "value": 497,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "c2",
          "value": "c2",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 31,
          "type": "bucket"
        },
        "$order": 32,
        "type": "metric"
      },
      "center": [47.8125, -118.125],
      "rectangle": [[45, -123.75], [45, -112.5], [50.625, -112.5], [50.625, -123.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-95.67718841135502, 46.75232579000294]},
    "properties": {
      "geohash": "cb",
      "value": 468,
      "aggConfigResult": {
        "key": 468,
        "value": 468,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "cb",
          "value": "cb",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 34,
          "type": "bucket"
        },
        "$order": 35,
        "type": "metric"
      },
      "center": [47.8125, -95.625],
      "rectangle": [[45, -101.25], [45, -90], [50.625, -90], [50.625, -101.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-106.2923239544034, 41.907251570373774]},
    "properties": {
      "geohash": "9x",
      "value": 396,
      "aggConfigResult": {
        "key": 396,
        "value": 396,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9x",
          "value": "9x",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 37,
          "type": "bucket"
        },
        "$order": 38,
        "type": "metric"
      },
      "center": [42.1875, -106.875],
      "rectangle": [[39.375, -112.5], [39.375, -101.25], [45, -101.25], [45, -112.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-119.63544443249702, 42.04197423532605]},
    "properties": {
      "geohash": "9r",
      "value": 370,
      "aggConfigResult": {
        "key": 370,
        "value": 370,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9r",
          "value": "9r",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 40,
          "type": "bucket"
        },
        "$order": 41,
        "type": "metric"
      },
      "center": [42.1875, -118.125],
      "rectangle": [[39.375, -123.75], [39.375, -112.5], [45, -112.5], [45, -123.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-76.97201896458864, 37.06826982088387]},
    "properties": {
      "geohash": "dq",
      "value": 364,
      "aggConfigResult": {
        "key": 364,
        "value": 364,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dq",
          "value": "dq",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 43,
          "type": "bucket"
        },
        "$order": 44,
        "type": "metric"
      },
      "center": [36.5625, -73.125],
      "rectangle": [[33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-106.92424703389406, 47.192871160805225]},
    "properties": {
      "geohash": "c8",
      "value": 305,
      "aggConfigResult": {
        "key": 305,
        "value": 305,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "c8",
          "value": "c8",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 46,
          "type": "bucket"
        },
        "$order": 47,
        "type": "metric"
      },
      "center": [47.8125, -106.875],
      "rectangle": [[45, -112.5], [45, -101.25], [50.625, -101.25], [50.625, -112.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-106.78505832329392, 32.50790253281593]},
    "properties": {
      "geohash": "9t",
      "value": 284,
      "aggConfigResult": {
        "key": 284,
        "value": 284,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9t",
          "value": "9t",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 49,
          "type": "bucket"
        },
        "$order": 50,
        "type": "metric"
      },
      "center": [30.9375, -106.875],
      "rectangle": [[28.125, -112.5], [28.125, -101.25], [33.75, -101.25], [33.75, -112.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-152.9292524792254, 59.777277521789074]},
    "properties": {
      "geohash": "bd",
      "value": 217,
      "aggConfigResult": {
        "key": 217,
        "value": 217,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "bd",
          "value": "bd",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 52,
          "type": "bucket"
        },
        "$order": 53,
        "type": "metric"
      },
      "center": [59.0625, -151.875],
      "rectangle": [[56.25, -157.5], [56.25, -146.25], [61.875, -146.25], [61.875, -157.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-81.13159038126469, 26.815882762894034]},
    "properties": {
      "geohash": "dh",
      "value": 214,
      "aggConfigResult": {
        "key": 214,
        "value": 214,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dh",
          "value": "dh",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 55,
          "type": "bucket"
        },
        "$order": 56,
        "type": "metric"
      },
      "center": [25.3125, -84.375],
      "rectangle": [[22.5, -90], [22.5, -78.75], [28.125, -78.75], [28.125, -90]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-162.1049272455275, 64.38826035708189]},
    "properties": {
      "geohash": "b7",
      "value": 194,
      "aggConfigResult": {
        "key": 194,
        "value": 194,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "b7",
          "value": "b7",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 58,
          "type": "bucket"
        },
        "$order": 59,
        "type": "metric"
      },
      "center": [64.6875, -163.125],
      "rectangle": [[61.875, -168.75], [61.875, -157.5], [67.5, -157.5], [67.5, -168.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-161.59194018691778, 60.06503529846668]},
    "properties": {
      "geohash": "b6",
      "value": 168,
      "aggConfigResult": {
        "key": 168,
        "value": 168,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "b6",
          "value": "b6",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 61,
          "type": "bucket"
        },
        "$order": 62,
        "type": "metric"
      },
      "center": [59.0625, -163.125],
      "rectangle": [[56.25, -168.75], [56.25, -157.5], [61.875, -157.5], [61.875, -168.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-86.82362716645002, 45.665992330759764]},
    "properties": {
      "geohash": "f0",
      "value": 166,
      "aggConfigResult": {
        "key": 166,
        "value": 166,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "f0",
          "value": "f0",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 64,
          "type": "bucket"
        },
        "$order": 65,
        "type": "metric"
      },
      "center": [47.8125, -84.375],
      "rectangle": [[45, -90], [45, -78.75], [50.625, -78.75], [50.625, -90]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-152.04110082238913, 65.17680524848402]},
    "properties": {
      "geohash": "be",
      "value": 158,
      "aggConfigResult": {
        "key": 158,
        "value": 158,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "be",
          "value": "be",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 67,
          "type": "bucket"
        },
        "$order": 68,
        "type": "metric"
      },
      "center": [64.6875, -151.875],
      "rectangle": [[61.875, -157.5], [61.875, -146.25], [67.5, -146.25], [67.5, -157.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-116.37748382985592, 33.16976627334952]},
    "properties": {
      "geohash": "9m",
      "value": 100,
      "aggConfigResult": {
        "key": 100,
        "value": 100,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9m",
          "value": "9m",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 70,
          "type": "bucket"
        },
        "$order": 71,
        "type": "metric"
      },
      "center": [30.9375, -118.125],
      "rectangle": [[28.125, -123.75], [28.125, -112.5], [33.75, -112.5], [33.75, -123.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-139.12713261321187, 59.41271326504648]},
    "properties": {
      "geohash": "bf",
      "value": 72,
      "aggConfigResult": {
        "key": 72,
        "value": 72,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "bf",
          "value": "bf",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 73,
          "type": "bucket"
        },
        "$order": 74,
        "type": "metric"
      },
      "center": [59.0625, -140.625],
      "rectangle": [[56.25, -146.25], [56.25, -135], [61.875, -135], [61.875, -146.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-97.89513738825917, 26.928304536268115]},
    "properties": {
      "geohash": "9u",
      "value": 68,
      "aggConfigResult": {
        "key": 68,
        "value": 68,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9u",
          "value": "9u",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 76,
          "type": "bucket"
        },
        "$order": 77,
        "type": "metric"
      },
      "center": [25.3125, -95.625],
      "rectangle": [[22.5, -101.25], [22.5, -90], [28.125, -90], [28.125, -101.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-132.52599561586976, 55.60743710026145]},
    "properties": {
      "geohash": "c1",
      "value": 67,
      "aggConfigResult": {
        "key": 67,
        "value": 67,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "c1",
          "value": "c1",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 79,
          "type": "bucket"
        },
        "$order": 80,
        "type": "metric"
      },
      "center": [53.4375, -129.375],
      "rectangle": [[50.625, -135], [50.625, -123.75], [56.25, -123.75], [56.25, -135]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-124.13590382784605, 42.24034773185849]},
    "properties": {
      "geohash": "9p",
      "value": 58,
      "aggConfigResult": {
        "key": 58,
        "value": 58,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9p",
          "value": "9p",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 82,
          "type": "bucket"
        },
        "$order": 83,
        "type": "metric"
      },
      "center": [42.1875, -129.375],
      "rectangle": [[39.375, -135], [39.375, -123.75], [45, -123.75], [45, -135]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-65.72741221636534, 18.170374436303973]},
    "properties": {
      "geohash": "de",
      "value": 57,
      "aggConfigResult": {
        "key": 57,
        "value": 57,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "de",
          "value": "de",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 85,
          "type": "bucket"
        },
        "$order": 86,
        "type": "metric"
      },
      "center": [19.6875, -61.875],
      "rectangle": [[16.875, -67.5], [16.875, -56.25], [22.5, -56.25], [22.5, -67.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-133.79055473953485, 57.08371731452644]},
    "properties": {
      "geohash": "c4",
      "value": 56,
      "aggConfigResult": {
        "key": 56,
        "value": 56,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "c4",
          "value": "c4",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 88,
          "type": "bucket"
        },
        "$order": 89,
        "type": "metric"
      },
      "center": [59.0625, -129.375],
      "rectangle": [[56.25, -135], [56.25, -123.75], [61.875, -123.75], [61.875, -135]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-152.2658603824675, 69.64116730727255]},
    "properties": {
      "geohash": "bs",
      "value": 51,
      "aggConfigResult": {
        "key": 51,
        "value": 51,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "bs",
          "value": "bs",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 91,
          "type": "bucket"
        },
        "$order": 92,
        "type": "metric"
      },
      "center": [70.3125, -151.875],
      "rectangle": [[67.5, -157.5], [67.5, -146.25], [73.125, -146.25], [73.125, -157.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-143.8043469004333, 64.64996575377882]},
    "properties": {
      "geohash": "bg",
      "value": 49,
      "aggConfigResult": {
        "key": 49,
        "value": 49,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "bg",
          "value": "bg",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 94,
          "type": "bucket"
        },
        "$order": 95,
        "type": "metric"
      },
      "center": [64.6875, -140.625],
      "rectangle": [[61.875, -146.25], [61.875, -135], [67.5, -135], [67.5, -146.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-162.65227859839797, 54.967785738408566]},
    "properties": {
      "geohash": "b3",
      "value": 43,
      "aggConfigResult": {
        "key": 43,
        "value": 43,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "b3",
          "value": "b3",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 97,
          "type": "bucket"
        },
        "$order": 98,
        "type": "metric"
      },
      "center": [53.4375, -163.125],
      "rectangle": [[50.625, -168.75], [50.625, -157.5], [56.25, -157.5], [56.25, -168.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-156.20294423773885, 20.63592097721994]},
    "properties": {
      "geohash": "8e",
      "value": 40,
      "aggConfigResult": {
        "key": 40,
        "value": 40,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "8e",
          "value": "8e",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 100,
          "type": "bucket"
        },
        "$order": 101,
        "type": "metric"
      },
      "center": [19.6875, -151.875],
      "rectangle": [[16.875, -157.5], [16.875, -146.25], [22.5, -146.25], [22.5, -157.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-68.71966263279319, 45.89407338760793]},
    "properties": {
      "geohash": "f2",
      "value": 37,
      "aggConfigResult": {
        "key": 37,
        "value": 37,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "f2",
          "value": "f2",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 103,
          "type": "bucket"
        },
        "$order": 104,
        "type": "metric"
      },
      "center": [47.8125, -73.125],
      "rectangle": [[45, -78.75], [45, -67.5], [50.625, -67.5], [50.625, -78.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-159.04649432748556, 21.810192000120878]},
    "properties": {
      "geohash": "87",
      "value": 31,
      "aggConfigResult": {
        "key": 31,
        "value": 31,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "87",
          "value": "87",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 106,
          "type": "bucket"
        },
        "$order": 107,
        "type": "metric"
      },
      "center": [19.6875, -163.125],
      "rectangle": [[16.875, -168.75], [16.875, -157.5], [22.5, -157.5], [22.5, -168.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-124.07574724406004, 46.70505428686738]},
    "properties": {
      "geohash": "c0",
      "value": 30,
      "aggConfigResult": {
        "key": 30,
        "value": 30,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "c0",
          "value": "c0",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 109,
          "type": "bucket"
        },
        "$order": 110,
        "type": "metric"
      },
      "center": [47.8125, -129.375],
      "rectangle": [[45, -135], [45, -123.75], [50.625, -123.75], [50.625, -135]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-170.66843625158072, 64.42178352735937]},
    "properties": {
      "geohash": "b5",
      "value": 18,
      "aggConfigResult": {
        "key": 18,
        "value": 18,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "b5",
          "value": "b5",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 112,
          "type": "bucket"
        },
        "$order": 113,
        "type": "metric"
      },
      "center": [64.6875, -174.375],
      "rectangle": [[61.875, -180], [61.875, -168.75], [67.5, -168.75], [67.5, -180]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-164.1237143240869, 68.94954898394644]},
    "properties": {
      "geohash": "bk",
      "value": 17,
      "aggConfigResult": {
        "key": 17,
        "value": 17,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "bk",
          "value": "bk",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 115,
          "type": "bucket"
        },
        "$order": 116,
        "type": "metric"
      },
      "center": [70.3125, -163.125],
      "rectangle": [[67.5, -168.75], [67.5, -157.5], [73.125, -157.5], [73.125, -168.75]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-145.23947272449732, 14.257271960377693]},
    "properties": {
      "geohash": "8f",
      "value": 17,
      "aggConfigResult": {
        "key": 17,
        "value": 17,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "8f",
          "value": "8f",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 118,
          "type": "bucket"
        },
        "$order": 119,
        "type": "metric"
      },
      "center": [14.0625, -140.625],
      "rectangle": [[11.25, -146.25], [11.25, -135], [16.875, -135], [16.875, -146.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-169.90729674696922, 56.83546897955239]},
    "properties": {
      "geohash": "b4",
      "value": 16,
      "aggConfigResult": {
        "key": 16,
        "value": 16,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "b4",
          "value": "b4",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 121,
          "type": "bucket"
        },
        "$order": 122,
        "type": "metric"
      },
      "center": [59.0625, -174.375],
      "rectangle": [[56.25, -180], [56.25, -168.75], [61.875, -168.75], [61.875, -180]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-170.12874579057097, 14.265542635694146]},
    "properties": {
      "geohash": "84",
      "value": 12,
      "aggConfigResult": {
        "key": 12,
        "value": 12,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "84",
          "value": "84",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 124,
          "type": "bucket"
        },
        "$order": 125,
        "type": "metric"
      },
      "center": [14.0625, -174.375],
      "rectangle": [[11.25, -180], [11.25, -168.75], [16.875, -168.75], [16.875, -180]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-144.66744488105178, 69.03327229432762]},
    "properties": {
      "geohash": "bu",
      "value": 11,
      "aggConfigResult": {
        "key": 11,
        "value": 11,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "bu",
          "value": "bu",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 127,
          "type": "bucket"
        },
        "$order": 128,
        "type": "metric"
      },
      "center": [70.3125, -140.625],
      "rectangle": [[67.5, -146.25], [67.5, -135], [73.125, -135], [73.125, -146.25]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-67.10587805137038, 44.86871098168194]},
    "properties": {
      "geohash": "dx",
      "value": 5,
      "aggConfigResult": {
        "key": 5,
        "value": 5,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "dx",
          "value": "dx",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 130,
          "type": "bucket"
        },
        "$order": 131,
        "type": "metric"
      },
      "center": [42.1875, -61.875],
      "rectangle": [[39.375, -67.5], [39.375, -56.25], [45, -56.25], [45, -67.5]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-174.69428664073348, 52.15187128633261]},
    "properties": {
      "geohash": "b1",
      "value": 5,
      "aggConfigResult": {
        "key": 5,
        "value": 5,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "b1",
          "value": "b1",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 133,
          "type": "bucket"
        },
        "$order": 134,
        "type": "metric"
      },
      "center": [53.4375, -174.375],
      "rectangle": [[50.625, -180], [50.625, -168.75], [56.25, -168.75], [56.25, -180]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-123.75373480841517, 39.26203776150942]},
    "properties": {
      "geohash": "9n",
      "value": 5,
      "aggConfigResult": {
        "key": 5,
        "value": 5,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "9n",
          "value": "9n",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 136,
          "type": "bucket"
        },
        "$order": 137,
        "type": "metric"
      },
      "center": [36.5625, -129.375],
      "rectangle": [[33.75, -135], [33.75, -123.75], [39.375, -123.75], [39.375, -135]]
    }
  }, {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-145.7686112076044, 18.124444372951984]},
    "properties": {
      "geohash": "8g",
      "value": 2,
      "aggConfigResult": {
        "key": 2,
        "value": 2,
        "aggConfig": {"id": "1", "enabled": true, "type": "count", "schema": "metric", "params": {}},
        "$parent": {
          "key": "8g",
          "value": "8g",
          "aggConfig": {
            "id": "2",
            "enabled": true,
            "type": "geohash_grid",
            "schema": "segment",
            "params": {"field": "geo.coordinates", "autoPrecision": true, "useGeocentroid": true, "precision": 2}
          },
          "$order": 139,
          "type": "bucket"
        },
        "$order": 140,
        "type": "metric"
      },
      "center": [19.6875, -140.625],
      "rectangle": [[16.875, -146.25], [16.875, -135], [22.5, -135], [22.5, -146.25]]
    }
  }],
  "properties": {"min": 2, "max": 1418, "zoom": 3, "center": [39.57182223734374, -109.51171875]}
}`;

export const GeoHashSampleData = JSON.parse(sampleData);
