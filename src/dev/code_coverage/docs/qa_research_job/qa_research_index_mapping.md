```
PUT /qa_research_code_coverage/_mapping
{
  "properties": {
    "@timestamp": {
      "type": "date"
    },
    "BUILD_ID": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "COVERAGE_INGESTION_KIBANA_ROOT": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "branches": {
      "properties": {
        "covered": {
          "type": "long"
        },
        "pct": {
          "type": "long"
        },
        "skipped": {
          "type": "long"
        },
        "total": {
          "type": "long"
        }
      }
    },
    "ciRunUrl": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "coveredFilePath": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "functions": {
      "properties": {
        "covered": {
          "type": "long"
        },
        "pct": {
          "type": "long"
        },
        "skipped": {
          "type": "long"
        },
        "total": {
          "type": "long"
        }
      }
    },
    "isTotal": {
      "type": "boolean"
    },
    "jsonSummaryPath": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "lines": {
      "properties": {
        "covered": {
          "type": "long"
        },
        "pct": {
          "type": "long"
        },
        "skipped": {
          "type": "long"
        },
        "total": {
          "type": "long"
        }
      }
    },
    "originalFilePath": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "path": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "pipeline": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "statements": {
      "properties": {
        "covered": {
          "type": "long"
        },
        "pct": {
          "type": "long"
        },
        "skipped": {
          "type": "long"
        },
        "total": {
          "type": "long"
        }
      }
    },
    "staticSiteUrl": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "team": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "testRunnerType": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "vcs": {
      "properties": {
        "author": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "branch": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "commitMsg": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "sha": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "vcsCommitUrl": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "vcsCompareUrl": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "vcsUrl": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        }
      }
    }
  }
}
```

Execute the above in Kibana Dev Tools, eg: ![Index Mapping Screenshot](./put_qa_research_code_coverage_with_mapping.png "QA Research Code Coverage Index Mapping")