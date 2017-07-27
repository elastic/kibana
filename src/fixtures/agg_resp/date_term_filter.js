const response = {
  'took': 128,
  'timed_out': false,
  '_shards': {
    'total': 1,
    'successful': 1,
    'skipped': 0,
    'failed': 0
  },
  'hits': {
    'total': 11125,
    'max_score': 0,
    'hits': []
  },
  'aggregations': {
    '2': {
      'buckets': [{
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 40
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 40
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 3
                }
              }
            },
            'key': '404',
            'doc_count': 3
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 1
          }]
        },
        'key_as_string': '2017-07-25T00:00:00.000+02:00',
        'key': 1500933600000,
        'doc_count': 44
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 148
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 148
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 8
                }
              }
            },
            'key': '404',
            'doc_count': 8
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 2
          }]
        },
        'key_as_string': '2017-07-25T03:00:00.000+02:00',
        'key': 1500944400000,
        'doc_count': 158
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 613
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '200',
            'doc_count': 613
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 3
                },
                '404': {
                  'doc_count': 29
                }
              }
            },
            'key': '404',
            'doc_count': 29
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 2
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 20
          }]
        },
        'key_as_string': '2017-07-25T06:00:00.000+02:00',
        'key': 1500955200000,
        'doc_count': 662
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1281
                },
                '404': {
                  'doc_count': 3
                }
              }
            },
            'key': '200',
            'doc_count': 1281
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 5
                },
                '404': {
                  'doc_count': 83
                }
              }
            },
            'key': '404',
            'doc_count': 83
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 3
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 36
          }]
        },
        'key_as_string': '2017-07-25T09:00:00.000+02:00',
        'key': 1500966000000,
        'doc_count': 1400
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1276
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '200',
            'doc_count': 1276
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1
                },
                '404': {
                  'doc_count': 65
                }
              }
            },
            'key': '404',
            'doc_count': 65
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 6
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 46
          }]
        },
        'key_as_string': '2017-07-25T12:00:00.000+02:00',
        'key': 1500976800000,
        'doc_count': 1387
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 705
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '200',
            'doc_count': 705
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 2
                },
                '404': {
                  'doc_count': 24
                }
              }
            },
            'key': '404',
            'doc_count': 24
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '503',
            'doc_count': 17
          }]
        },
        'key_as_string': '2017-07-25T15:00:00.000+02:00',
        'key': 1500987600000,
        'doc_count': 746
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 200
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 200
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1
                },
                '404': {
                  'doc_count': 15
                }
              }
            },
            'key': '404',
            'doc_count': 15
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 11
          }]
        },
        'key_as_string': '2017-07-25T18:00:00.000+02:00',
        'key': 1500998400000,
        'doc_count': 226
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 37
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 37
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 3
                }
              }
            },
            'key': '404',
            'doc_count': 3
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 2
          }]
        },
        'key_as_string': '2017-07-25T21:00:00.000+02:00',
        'key': 1501009200000,
        'doc_count': 42
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 40
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 40
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '404',
            'doc_count': 1
          }]
        },
        'key_as_string': '2017-07-26T00:00:00.000+02:00',
        'key': 1501020000000,
        'doc_count': 41
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 183
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 183
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 14
                }
              }
            },
            'key': '404',
            'doc_count': 14
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 4
          }]
        },
        'key_as_string': '2017-07-26T03:00:00.000+02:00',
        'key': 1501030800000,
        'doc_count': 201
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 662
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 662
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1
                },
                '404': {
                  'doc_count': 34
                }
              }
            },
            'key': '404',
            'doc_count': 34
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 19
          }]
        },
        'key_as_string': '2017-07-26T06:00:00.000+02:00',
        'key': 1501041600000,
        'doc_count': 715
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1286
                },
                '404': {
                  'doc_count': 3
                }
              }
            },
            'key': '200',
            'doc_count': 1286
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 5
                },
                '404': {
                  'doc_count': 66
                }
              }
            },
            'key': '404',
            'doc_count': 66
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 2
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 50
          }]
        },
        'key_as_string': '2017-07-26T09:00:00.000+02:00',
        'key': 1501052400000,
        'doc_count': 1402
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1272
                },
                '404': {
                  'doc_count': 3
                }
              }
            },
            'key': '200',
            'doc_count': 1272
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 6
                },
                '404': {
                  'doc_count': 73
                }
              }
            },
            'key': '404',
            'doc_count': 73
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '503',
            'doc_count': 45
          }]
        },
        'key_as_string': '2017-07-26T12:00:00.000+02:00',
        'key': 1501063200000,
        'doc_count': 1390
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 662
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 662
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 34
                }
              }
            },
            'key': '404',
            'doc_count': 34
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 1
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 14
          }]
        },
        'key_as_string': '2017-07-26T15:00:00.000+02:00',
        'key': 1501074000000,
        'doc_count': 710
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 159
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 159
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 12
                }
              }
            },
            'key': '404',
            'doc_count': 12
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 1
          }]
        },
        'key_as_string': '2017-07-26T18:00:00.000+02:00',
        'key': 1501084800000,
        'doc_count': 172
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 33
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 33
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 2
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '404',
            'doc_count': 1
          }]
        },
        'key_as_string': '2017-07-26T21:00:00.000+02:00',
        'key': 1501095600000,
        'doc_count': 36
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 33
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 33
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '404',
            'doc_count': 1
          }]
        },
        'key_as_string': '2017-07-27T00:00:00.000+02:00',
        'key': 1501106400000,
        'doc_count': 34
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 159
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '200',
            'doc_count': 159
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 11
                }
              }
            },
            'key': '404',
            'doc_count': 11
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 8
          }]
        },
        'key_as_string': '2017-07-27T03:00:00.000+02:00',
        'key': 1501117200000,
        'doc_count': 178
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 676
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '200',
            'doc_count': 676
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 2
                },
                '404': {
                  'doc_count': 45
                }
              }
            },
            'key': '404',
            'doc_count': 45
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 0
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 21
          }]
        },
        'key_as_string': '2017-07-27T06:00:00.000+02:00',
        'key': 1501128000000,
        'doc_count': 742
      }, {
        '3': {
          'doc_count_error_upper_bound': 0,
          'sum_other_doc_count': 0,
          'buckets': [{
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 778
                },
                '404': {
                  'doc_count': 1
                }
              }
            },
            'key': '200',
            'doc_count': 778
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 2
                },
                '404': {
                  'doc_count': 42
                }
              }
            },
            'key': '404',
            'doc_count': 42
          }, {
            '4': {
              'buckets': {
                '200': {
                  'doc_count': 2
                },
                '404': {
                  'doc_count': 0
                }
              }
            },
            'key': '503',
            'doc_count': 19
          }]
        },
        'key_as_string': '2017-07-27T09:00:00.000+02:00',
        'key': 1501138800000,
        'doc_count': 839
      }]
    }
  },
  'status': 200
};

export default response;
