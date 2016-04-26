import _ from 'lodash';

module.exports = {
  'valueFormatter': _.identity,
  'geohashGridAgg': { 'vis': { 'params': {} } },
  'geoJson': {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            22.5,
            22.5
          ]
        },
        'properties': {
          'value': 608,
          'geohash': 's',
          'center': [
            22.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 's',
              'value': 's',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 608,
            'value': 608,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              0
            ],
            [
              0,
              45
            ],
            [
              45,
              45
            ],
            [
              45,
              0
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            112.5,
            22.5
          ]
        },
        'properties': {
          'value': 522,
          'geohash': 'w',
          'center': [
            112.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'w',
              'value': 'w',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 522,
            'value': 522,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              90
            ],
            [
              0,
              135
            ],
            [
              45,
              135
            ],
            [
              45,
              90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -67.5,
            -22.5
          ]
        },
        'properties': {
          'value': 517,
          'geohash': '6',
          'center': [
            -67.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '6',
              'value': '6',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 517,
            'value': 517,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              -90
            ],
            [
              -45,
              -45
            ],
            [
              0,
              -45
            ],
            [
              0,
              -90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -67.5,
            22.5
          ]
        },
        'properties': {
          'value': 446,
          'geohash': 'd',
          'center': [
            -67.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'd',
              'value': 'd',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 446,
            'value': 446,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              -90
            ],
            [
              0,
              -45
            ],
            [
              45,
              -45
            ],
            [
              45,
              -90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            22.5,
            67.5
          ]
        },
        'properties': {
          'value': 426,
          'geohash': 'u',
          'center': [
            22.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'u',
              'value': 'u',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 426,
            'value': 426,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              0
            ],
            [
              45,
              45
            ],
            [
              90,
              45
            ],
            [
              90,
              0
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            67.5,
            22.5
          ]
        },
        'properties': {
          'value': 413,
          'geohash': 't',
          'center': [
            67.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 't',
              'value': 't',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 413,
            'value': 413,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              45
            ],
            [
              0,
              90
            ],
            [
              45,
              90
            ],
            [
              45,
              45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            22.5,
            -22.5
          ]
        },
        'properties': {
          'value': 362,
          'geohash': 'k',
          'center': [
            22.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'k',
              'value': 'k',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 362,
            'value': 362,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              0
            ],
            [
              -45,
              45
            ],
            [
              0,
              45
            ],
            [
              0,
              0
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -112.5,
            22.5
          ]
        },
        'properties': {
          'value': 352,
          'geohash': '9',
          'center': [
            -112.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '9',
              'value': '9',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 352,
            'value': 352,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              -135
            ],
            [
              0,
              -90
            ],
            [
              45,
              -90
            ],
            [
              45,
              -135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -22.5,
            22.5
          ]
        },
        'properties': {
          'value': 216,
          'geohash': 'e',
          'center': [
            -22.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'e',
              'value': 'e',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 216,
            'value': 216,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              -45
            ],
            [
              0,
              0
            ],
            [
              45,
              0
            ],
            [
              45,
              -45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            67.5,
            67.5
          ]
        },
        'properties': {
          'value': 183,
          'geohash': 'v',
          'center': [
            67.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'v',
              'value': 'v',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 183,
            'value': 183,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              45
            ],
            [
              45,
              90
            ],
            [
              90,
              90
            ],
            [
              90,
              45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            157.5,
            -22.5
          ]
        },
        'properties': {
          'value': 158,
          'geohash': 'r',
          'center': [
            157.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'r',
              'value': 'r',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 158,
            'value': 158,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              135
            ],
            [
              -45,
              180
            ],
            [
              0,
              180
            ],
            [
              0,
              135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            112.5,
            67.5
          ]
        },
        'properties': {
          'value': 139,
          'geohash': 'y',
          'center': [
            112.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'y',
              'value': 'y',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 139,
            'value': 139,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              90
            ],
            [
              45,
              135
            ],
            [
              90,
              135
            ],
            [
              90,
              90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -112.5,
            67.5
          ]
        },
        'properties': {
          'value': 110,
          'geohash': 'c',
          'center': [
            -112.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'c',
              'value': 'c',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 110,
            'value': 110,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              -135
            ],
            [
              45,
              -90
            ],
            [
              90,
              -90
            ],
            [
              90,
              -135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            112.5,
            -22.5
          ]
        },
        'properties': {
          'value': 101,
          'geohash': 'q',
          'center': [
            112.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'q',
              'value': 'q',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 101,
            'value': 101,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              90
            ],
            [
              -45,
              135
            ],
            [
              0,
              135
            ],
            [
              0,
              90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -22.5,
            -22.5
          ]
        },
        'properties': {
          'value': 101,
          'geohash': '7',
          'center': [
            -22.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '7',
              'value': '7',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 101,
            'value': 101,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              -45
            ],
            [
              -45,
              0
            ],
            [
              0,
              0
            ],
            [
              0,
              -45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -67.5,
            67.5
          ]
        },
        'properties': {
          'value': 92,
          'geohash': 'f',
          'center': [
            -67.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'f',
              'value': 'f',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 92,
            'value': 92,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              -90
            ],
            [
              45,
              -45
            ],
            [
              90,
              -45
            ],
            [
              90,
              -90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -157.5,
            67.5
          ]
        },
        'properties': {
          'value': 75,
          'geohash': 'b',
          'center': [
            -157.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'b',
              'value': 'b',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 75,
            'value': 75,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              -180
            ],
            [
              45,
              -135
            ],
            [
              90,
              -135
            ],
            [
              90,
              -180
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -22.5,
            67.5
          ]
        },
        'properties': {
          'value': 64,
          'geohash': 'g',
          'center': [
            -22.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'g',
              'value': 'g',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 64,
            'value': 64,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              -45
            ],
            [
              45,
              0
            ],
            [
              90,
              0
            ],
            [
              90,
              -45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            157.5,
            67.5
          ]
        },
        'properties': {
          'value': 36,
          'geohash': 'z',
          'center': [
            157.5,
            67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'z',
              'value': 'z',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 36,
            'value': 36,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              45,
              135
            ],
            [
              45,
              180
            ],
            [
              90,
              180
            ],
            [
              90,
              135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            157.5,
            22.5
          ]
        },
        'properties': {
          'value': 34,
          'geohash': 'x',
          'center': [
            157.5,
            22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'x',
              'value': 'x',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 34,
            'value': 34,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              0,
              135
            ],
            [
              0,
              180
            ],
            [
              45,
              180
            ],
            [
              45,
              135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -67.5,
            -67.5
          ]
        },
        'properties': {
          'value': 30,
          'geohash': '4',
          'center': [
            -67.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '4',
              'value': '4',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 30,
            'value': 30,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              -90
            ],
            [
              -90,
              -45
            ],
            [
              -45,
              -45
            ],
            [
              -45,
              -90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            67.5,
            -22.5
          ]
        },
        'properties': {
          'value': 16,
          'geohash': 'm',
          'center': [
            67.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'm',
              'value': 'm',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 16,
            'value': 16,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              45
            ],
            [
              -45,
              90
            ],
            [
              0,
              90
            ],
            [
              0,
              45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -22.5,
            -67.5
          ]
        },
        'properties': {
          'value': 10,
          'geohash': '5',
          'center': [
            -22.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '5',
              'value': '5',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 10,
            'value': 10,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              -45
            ],
            [
              -90,
              0
            ],
            [
              -45,
              0
            ],
            [
              -45,
              -45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            157.5,
            -67.5
          ]
        },
        'properties': {
          'value': 6,
          'geohash': 'p',
          'center': [
            157.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'p',
              'value': 'p',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 6,
            'value': 6,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              135
            ],
            [
              -90,
              180
            ],
            [
              -45,
              180
            ],
            [
              -45,
              135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -157.5,
            -22.5
          ]
        },
        'properties': {
          'value': 6,
          'geohash': '2',
          'center': [
            -157.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '2',
              'value': '2',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 6,
            'value': 6,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              -180
            ],
            [
              -45,
              -135
            ],
            [
              0,
              -135
            ],
            [
              0,
              -180
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            22.5,
            -67.5
          ]
        },
        'properties': {
          'value': 4,
          'geohash': 'h',
          'center': [
            22.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'h',
              'value': 'h',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 4,
            'value': 4,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              0
            ],
            [
              -90,
              45
            ],
            [
              -45,
              45
            ],
            [
              -45,
              0
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            112.5,
            -67.5
          ]
        },
        'properties': {
          'value': 2,
          'geohash': 'n',
          'center': [
            112.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'n',
              'value': 'n',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 2,
            'value': 2,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              90
            ],
            [
              -90,
              135
            ],
            [
              -45,
              135
            ],
            [
              -45,
              90
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            67.5,
            -67.5
          ]
        },
        'properties': {
          'value': 2,
          'geohash': 'j',
          'center': [
            67.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': 'j',
              'value': 'j',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 2,
            'value': 2,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              45
            ],
            [
              -90,
              90
            ],
            [
              -45,
              90
            ],
            [
              -45,
              45
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -112.5,
            -22.5
          ]
        },
        'properties': {
          'value': 1,
          'geohash': '3',
          'center': [
            -112.5,
            -22.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '3',
              'value': '3',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 1,
            'value': 1,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -45,
              -135
            ],
            [
              -45,
              -90
            ],
            [
              0,
              -90
            ],
            [
              0,
              -135
            ]
          ]
        }
      },
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [
            -112.5,
            -67.5
          ]
        },
        'properties': {
          'value': 1,
          'geohash': '1',
          'center': [
            -112.5,
            -67.5
          ],
          'aggConfigResult': {
            '$parent': {
              'key': '1',
              'value': '1',
              'aggConfig': {
                'id': '2',
                'type': 'geohash_grid',
                'schema': 'segment',
                'params': {
                  'field': 'geo.coordinates',
                  'precision': 1
                }
              },
              'type': 'bucket'
            },
            'key': 1,
            'value': 1,
            'aggConfig': {
              'id': '1',
              'type': 'count',
              'schema': 'metric',
              'params': {}
            },
            'type': 'metric'
          },
          'rectangle': [
            [
              -90,
              -135
            ],
            [
              -90,
              -90
            ],
            [
              -45,
              -90
            ],
            [
              -45,
              -135
            ]
          ]
        }
      }
    ],
    'properties': {
      'min': 1,
      'max': 608,
      'zoom': 2,
      'center': [5, 15]
    }
  },
};
