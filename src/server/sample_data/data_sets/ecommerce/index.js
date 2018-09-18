/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path';
import { savedObjects } from './saved_objects';

export function ecommerceSpecProvider() {
  return {
    id: 'ecommerce',
<<<<<<< HEAD
<<<<<<< HEAD
    name: 'Sample eCommerce orders',
    description: 'Sample data, visualizations, and dashboards for tracking eCommerce orders.',
    previewImagePath: '/plugins/kibana/home/sample_data_resources/ecommerce/dashboard.png',
    overviewDashboard: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    defaultIndex: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
=======
    name: 'Sample eCommerce data',
    description: 'Sample data, visualizations, and dashboards for monitoring eCommerce.',
=======
    name: 'Sample eCommerce orders',
    description: 'Sample data, visualizations, and dashboards for tracking eCommerce orders.',
>>>>>>> updated description
    previewImagePath: '/plugins/kibana/home/sample_data_resources/ecommerce/dashboard.png',
<<<<<<< HEAD
    overviewDashboard: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
>>>>>>> ecommerce data set
=======
    overviewDashboard: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    defaultIndex: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
>>>>>>> fix ids
    dataPath: path.join(__dirname, './ecommerce.json.gz'),
    fields: {
      category: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> mappings fix
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
<<<<<<< HEAD
=======
        type: 'keyword'
>>>>>>> ecommerce data set
=======
>>>>>>> mappings fix
      },
      customer_full_name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
<<<<<<< HEAD
<<<<<<< HEAD
            ignore_above: 256
=======
>>>>>>> ecommerce data set
=======
            ignore_above: 256
>>>>>>> mappings fix
          }
        }
      },
      customer_gender: {
        type: 'keyword'
      },
      customer_id: {
<<<<<<< HEAD
<<<<<<< HEAD
        type: 'keyword'
      },
      customer_last_name: {
=======
        type: 'integer'
      },
      customer_last_name: {
        type: 'keyword'
      },
      customer_phone: {
>>>>>>> ecommerce data set
=======
        type: 'keyword'
      },
      customer_last_name: {
>>>>>>> mappings fix
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
<<<<<<< HEAD
<<<<<<< HEAD
            ignore_above: 256
          }
        }
      },
      customer_phone: {
        type: 'keyword'
      },
=======
          }
        }
      },
>>>>>>> ecommerce data set
=======
            ignore_above: 256
          }
        }
      },
      customer_phone: {
        type: 'keyword'
      },
>>>>>>> mappings fix
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
            type: 'keyword',
          }
        }
      },
      order_date: {
        type: 'date'
      },
      order_id: {
<<<<<<< HEAD
<<<<<<< HEAD
        type: 'keyword'
      },
      products: {
        properties: {
          base_price: { type: 'half_float' },
          discount_percentage: { type: 'half_float' },
=======
        type: 'integer'
=======
        type: 'keyword'
>>>>>>> mappings fix
      },
      products: {
        properties: {
<<<<<<< HEAD
          base_price: { type: 'float' },
          discount_percentage: { type: 'float' },
>>>>>>> ecommerce data set
=======
          base_price: { type: 'half_float' },
          discount_percentage: { type: 'half_float' },
>>>>>>> mappings fix
          quantity: { type: 'integer' },
          manufacturer: {
            type: 'text',
            fields: {
              keyword: {
<<<<<<< HEAD
<<<<<<< HEAD
                type: 'keyword'
              }
            }
          },
          tax_amount: { type: 'half_float' },
          product_id: { type: 'long' },
=======
                type: 'keyword',
              }
            }
          },
          tax_amount: { type: 'float' },
          product_id: { type: 'integer' },
>>>>>>> ecommerce data set
=======
                type: 'keyword'
              }
            }
          },
          tax_amount: { type: 'half_float' },
          product_id: { type: 'long' },
>>>>>>> mappings fix
          category: {
            type: 'text',
            fields: {
              keyword: {
<<<<<<< HEAD
<<<<<<< HEAD
                type: 'keyword'
              }
            }
          },
          sku: { type: 'keyword' },
          taxless_price: { type: 'half_float' },
          unit_discount_amount: { type: 'half_float' },
          min_price: { type: 'half_float' },
          _id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          discount_amount: { type: 'half_float' },
          created_on: { type: 'date' },
          product_name: {
            type: 'text',
            analyzer: 'english',
            fields: {
              keyword: {
                type: 'keyword'
              }
            }
          },
          price: { type: 'half_float' },
          taxful_price: { type: 'half_float' },
          base_unit_price: { type: 'half_float' },
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
=======
                type: 'keyword',
=======
                type: 'keyword'
>>>>>>> mappings fix
              }
            }
          },
          sku: { type: 'keyword' },
          taxless_price: { type: 'half_float' },
          unit_discount_amount: { type: 'half_float' },
          min_price: { type: 'half_float' },
          _id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          discount_amount: { type: 'half_float' },
          created_on: { type: 'date' },
          product_name: {
            type: 'text',
            analyzer: 'english',
            fields: {
              keyword: {
                type: 'keyword'
              }
            }
          },
          price: { type: 'half_float' },
          taxful_price: { type: 'half_float' },
          base_unit_price: { type: 'half_float' },
        }
      },
      sku: {
        type: 'keyword'
      },
      taxful_total_price: {
        type: 'half_float'
      },
      taxless_total_price: {
<<<<<<< HEAD
        type: 'float'
>>>>>>> ecommerce data set
=======
        type: 'half_float'
>>>>>>> mappings fix
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
<<<<<<< HEAD
<<<<<<< HEAD
        properties: {
          country_iso_code: { type: 'keyword' },
          location: { type: 'geo_point' },
          region_name: { type: 'keyword' },
=======
        type: 'nested',
        properties: {
          country_iso_code: { type: 'keyword' },
          location: { type: 'geo_point' },
          region_name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              }
            }
          },
>>>>>>> ecommerce data set
=======
        properties: {
          country_iso_code: { type: 'keyword' },
          location: { type: 'geo_point' },
          region_name: { type: 'keyword' },
>>>>>>> mappings fix
          continent_name: { type: 'keyword' },
          city_name: { type: 'keyword' }
        }
      }
    },
    timeFields: ['order_date'],
<<<<<<< HEAD
<<<<<<< HEAD
    currentTimeMarker: '2016-12-11T00:00:00',
=======
    currentTimeMarker: '2018-01-09T00:00:00',
>>>>>>> ecommerce data set
=======
    currentTimeMarker: '2016-12-11T00:00:00',
>>>>>>> fixes based on Nathan's feedback
    preserveDayOfWeekTimeOfDay: true,
    savedObjects: savedObjects,
  };
}
