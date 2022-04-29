"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fieldMappings = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const fieldMappings = {
  category: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword'
      }
    }
  },
  currency: {
    type: 'keyword'
  },
  customer_birth_date: {
    type: 'date'
  },
  customer_first_name: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256
      }
    }
  },
  customer_full_name: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256
      }
    }
  },
  customer_gender: {
    type: 'keyword'
  },
  customer_id: {
    type: 'keyword'
  },
  customer_last_name: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256
      }
    }
  },
  customer_phone: {
    type: 'keyword'
  },
  day_of_week: {
    type: 'keyword'
  },
  day_of_week_i: {
    type: 'integer'
  },
  email: {
    type: 'keyword'
  },
  manufacturer: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword'
      }
    }
  },
  order_date: {
    type: 'date'
  },
  order_id: {
    type: 'keyword'
  },
  products: {
    properties: {
      base_price: {
        type: 'half_float'
      },
      discount_percentage: {
        type: 'half_float'
      },
      quantity: {
        type: 'integer'
      },
      manufacturer: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword'
          }
        }
      },
      tax_amount: {
        type: 'half_float'
      },
      product_id: {
        type: 'long'
      },
      category: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword'
          }
        }
      },
      sku: {
        type: 'keyword'
      },
      taxless_price: {
        type: 'half_float'
      },
      unit_discount_amount: {
        type: 'half_float'
      },
      min_price: {
        type: 'half_float'
      },
      _id: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      discount_amount: {
        type: 'half_float'
      },
      created_on: {
        type: 'date'
      },
      product_name: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: {
            type: 'keyword'
          }
        }
      },
      price: {
        type: 'half_float'
      },
      taxful_price: {
        type: 'half_float'
      },
      base_unit_price: {
        type: 'half_float'
      }
    }
  },
  sku: {
    type: 'keyword'
  },
  taxful_total_price: {
    type: 'half_float'
  },
  taxless_total_price: {
    type: 'half_float'
  },
  total_quantity: {
    type: 'integer'
  },
  total_unique_products: {
    type: 'integer'
  },
  type: {
    type: 'keyword'
  },
  user: {
    type: 'keyword'
  },
  geoip: {
    properties: {
      country_iso_code: {
        type: 'keyword'
      },
      location: {
        type: 'geo_point'
      },
      region_name: {
        type: 'keyword'
      },
      continent_name: {
        type: 'keyword'
      },
      city_name: {
        type: 'keyword'
      }
    }
  },
  event: {
    properties: {
      dataset: {
        type: 'keyword'
      }
    }
  }
};
exports.fieldMappings = fieldMappings;