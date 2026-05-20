export declare const fieldMappings: {
    category: {
        type: string;
        fields: {
            keyword: {
                type: string;
            };
        };
    };
    currency: {
        type: string;
    };
    customer_birth_date: {
        type: string;
    };
    customer_first_name: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    customer_full_name: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    customer_gender: {
        type: string;
    };
    customer_id: {
        type: string;
    };
    customer_last_name: {
        type: string;
        fields: {
            keyword: {
                type: string;
                ignore_above: number;
            };
        };
    };
    customer_phone: {
        type: string;
    };
    day_of_week: {
        type: string;
    };
    day_of_week_i: {
        type: string;
    };
    email: {
        type: string;
    };
    manufacturer: {
        type: string;
        fields: {
            keyword: {
                type: string;
            };
        };
    };
    order_date: {
        type: string;
    };
    order_id: {
        type: string;
    };
    products: {
        properties: {
            base_price: {
                type: string;
            };
            discount_percentage: {
                type: string;
            };
            quantity: {
                type: string;
            };
            manufacturer: {
                type: string;
                fields: {
                    keyword: {
                        type: string;
                    };
                };
            };
            tax_amount: {
                type: string;
            };
            product_id: {
                type: string;
            };
            category: {
                type: string;
                fields: {
                    keyword: {
                        type: string;
                    };
                };
            };
            sku: {
                type: string;
            };
            taxless_price: {
                type: string;
            };
            unit_discount_amount: {
                type: string;
            };
            min_price: {
                type: string;
            };
            _id: {
                type: string;
                fields: {
                    keyword: {
                        type: string;
                        ignore_above: number;
                    };
                };
            };
            discount_amount: {
                type: string;
            };
            created_on: {
                type: string;
            };
            product_name: {
                type: string;
                analyzer: string;
                fields: {
                    keyword: {
                        type: string;
                    };
                };
            };
            price: {
                type: string;
            };
            taxful_price: {
                type: string;
            };
            base_unit_price: {
                type: string;
            };
        };
    };
    sku: {
        type: string;
    };
    taxful_total_price: {
        type: string;
    };
    taxless_total_price: {
        type: string;
    };
    total_quantity: {
        type: string;
    };
    total_unique_products: {
        type: string;
    };
    type: {
        type: string;
    };
    user: {
        type: string;
    };
    geoip: {
        properties: {
            country_iso_code: {
                type: string;
            };
            location: {
                type: string;
            };
            region_name: {
                type: string;
            };
            continent_name: {
                type: string;
            };
            city_name: {
                type: string;
            };
        };
    };
    event: {
        properties: {
            dataset: {
                type: string;
            };
        };
    };
};
