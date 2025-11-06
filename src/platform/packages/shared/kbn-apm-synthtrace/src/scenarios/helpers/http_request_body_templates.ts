/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Realistic JSON request body templates for HTTP access logs.
 * Used to generate varied POST/PUT/PATCH request payloads.
 */

import { getRandomItem } from './http_field_generators';

/**
 * User registration request template.
 */
export function generateUserRegistrationBody() {
  const firstNames = [
    'John',
    'Jane',
    'Michael',
    'Sarah',
    'David',
    'Emily',
    'Robert',
    'Lisa',
    'William',
    'Emma',
    'Mr Tug',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Bond',
  ];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'example.com'];

  const firstName = getRandomItem(firstNames);
  const lastName = getRandomItem(lastNames);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${getRandomItem(domains)}`;

  return {
    user: {
      firstName,
      lastName,
      email,
      username: `${firstName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
      password: '********', // Always masked
      dateOfBirth: `${1970 + Math.floor(Math.random() * 30)}-${String(
        Math.floor(Math.random() * 12) + 1
      ).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      address: {
        street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
        city: getRandomItem(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        state: getRandomItem(['NY', 'CA', 'IL', 'TX', 'AZ']),
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        country: 'US',
      },
      preferences: {
        newsletter: Math.random() > 0.5,
        notifications: Math.random() > 0.3,
        theme: getRandomItem(['light', 'dark', 'auto']),
      },
    },
    metadata: {
      source: getRandomItem(['web', 'mobile', 'api']),
      referrer: getRandomItem(['google', 'facebook', 'twitter', 'direct', 'email']),
    },
  };
}

/**
 * Product update request template.
 */
export function generateProductUpdateBody() {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'];
  const brands = ['BrandA', 'BrandB', 'BrandC', 'Generic', 'Premium'];

  return {
    product: {
      id: `prod_${Math.random().toString(36).substring(2, 15)}`,
      name: `Product ${Math.floor(Math.random() * 10000)}`,
      description: 'High-quality product with excellent features and durability',
      category: getRandomItem(categories),
      brand: getRandomItem(brands),
      price: {
        amount: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
        currency: 'USD',
        discount: Math.random() > 0.7 ? parseFloat((Math.random() * 30).toFixed(0)) : 0,
      },
      inventory: {
        quantity: Math.floor(Math.random() * 1000),
        warehouse: `WH-${Math.floor(Math.random() * 10) + 1}`,
        reserved: Math.floor(Math.random() * 50),
      },
      attributes: {
        color: getRandomItem(['Red', 'Blue', 'Green', 'Black', 'White']),
        size: getRandomItem(['S', 'M', 'L', 'XL', 'XXL']),
        weight: parseFloat((Math.random() * 10).toFixed(2)),
        dimensions: {
          length: parseFloat((Math.random() * 100).toFixed(1)),
          width: parseFloat((Math.random() * 100).toFixed(1)),
          height: parseFloat((Math.random() * 100).toFixed(1)),
          unit: 'cm',
        },
      },
      ratings: {
        average: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0
        count: Math.floor(Math.random() * 1000),
      },
      tags: ['featured', 'bestseller', 'new-arrival'].filter(() => Math.random() > 0.5),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Order submission request template.
 */
export function generateOrderSubmissionBody() {
  const items = Math.floor(Math.random() * 5) + 1;
  const orderItems = [];
  let subtotal = 0;

  for (let i = 0; i < items; i++) {
    const quantity = Math.floor(Math.random() * 3) + 1;
    const price = parseFloat((Math.random() * 100 + 10).toFixed(2));
    const itemTotal = quantity * price;
    subtotal += itemTotal;

    orderItems.push({
      productId: `prod_${Math.random().toString(36).substring(2, 15)}`,
      name: `Product ${Math.floor(Math.random() * 1000)}`,
      quantity,
      price,
      total: parseFloat(itemTotal.toFixed(2)),
    });
  }

  const tax = parseFloat((subtotal * 0.08).toFixed(2));
  const shipping = parseFloat((Math.random() * 20 + 5).toFixed(2));
  const total = parseFloat((subtotal + tax + shipping).toFixed(2));

  return {
    order: {
      orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: `cust_${Math.random().toString(36).substring(2, 15)}`,
      items: orderItems,
      pricing: {
        subtotal,
        tax,
        shipping,
        discount: 0,
        total,
      },
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
      billingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
      payment: {
        method: getRandomItem(['credit_card', 'debit_card', 'paypal', 'apple_pay']),
        last4: `${Math.floor(Math.random() * 9000) + 1000}`,
        status: 'pending',
      },
      shippingMethod: getRandomItem(['standard', 'express', 'overnight']),
      status: 'pending',
    },
    metadata: {
      source: 'web',
      userAgent: 'Mozilla/5.0',
      ipAddress: `${Math.floor(Math.random() * 256)}.${Math.floor(
        Math.random() * 256
      )}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
    },
  };
}

/**
 * Review submission request template.
 */
export function generateReviewSubmissionBody() {
  return {
    review: {
      productId: `prod_${Math.random().toString(36).substring(2, 15)}`,
      userId: `user_${Math.random().toString(36).substring(2, 15)}`,
      rating: Math.floor(Math.random() * 5) + 1, // 1-5
      title: getRandomItem([
        'Great product!',
        'Exceeded expectations',
        'Good value for money',
        'Not what I expected',
        'Amazing quality',
      ]),
      content:
        'This is a detailed review of the product. It covers various aspects including quality, durability, and value for money.',
      verified: Math.random() > 0.3,
      helpful: Math.floor(Math.random() * 100),
      images: Array(Math.floor(Math.random() * 4))
        .fill(0)
        .map((_, i) => `https://example.com/reviews/img${i}.jpg`),
      pros: ['Good quality', 'Fast shipping'],
      cons: ['Price could be better'],
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Analytics event request template.
 */
export function generateAnalyticsEventBody() {
  return {
    event: {
      type: getRandomItem([
        'page_view',
        'button_click',
        'form_submit',
        'video_play',
        'download',
        'search',
      ]),
      category: getRandomItem(['engagement', 'conversion', 'navigation', 'interaction']),
      action: getRandomItem(['click', 'view', 'submit', 'scroll', 'hover']),
      label: `Event ${Math.floor(Math.random() * 1000)}`,
      value: Math.floor(Math.random() * 100),
      nonInteraction: Math.random() > 0.8,
    },
    user: {
      id: `user_${Math.random().toString(36).substring(2, 15)}`,
      sessionId: `sess_${Math.random().toString(36).substring(2, 15)}`,
      anonymous: Math.random() > 0.6,
    },
    page: {
      url: 'https://example.com/page',
      title: 'Example Page',
      referrer: 'https://google.com',
      path: '/page',
    },
    device: {
      type: getRandomItem(['desktop', 'mobile', 'tablet']),
      os: getRandomItem(['Windows', 'macOS', 'iOS', 'Android', 'Linux']),
      browser: getRandomItem(['Chrome', 'Safari', 'Firefox', 'Edge']),
      screenResolution: getRandomItem(['1920x1080', '1366x768', '375x667', '414x896']),
    },
    timestamp: new Date().toISOString(),
    customDimensions: {
      dimension1: 'value1',
      dimension2: 'value2',
    },
  };
}

/**
 * OAuth token request template.
 */
export function generateOAuthTokenRequestBody() {
  return {
    grant_type: getRandomItem(['authorization_code', 'refresh_token', 'client_credentials']),
    client_id: `client_${Math.random().toString(36).substring(2, 15)}`,
    client_secret: '********', // Always masked
    code: Math.random().toString(36).substring(2, 25),
    redirect_uri: 'https://example.com/callback',
    scope: getRandomItem(['read', 'write', 'admin', 'read write', 'openid profile email']),
    state: Math.random().toString(36).substring(2, 15),
  };
}

/**
 * Search query request template.
 */
export function generateSearchQueryBody() {
  const keywords = [
    'electronics',
    'laptop',
    'phone',
    'headphones',
    'camera',
    'shoes',
    'clothing',
    'books',
  ];

  return {
    query: {
      text: getRandomItem(keywords),
      filters: {
        category: getRandomItem(['all', 'electronics', 'clothing', 'books']),
        priceRange: {
          min: 0,
          max: Math.floor(Math.random() * 1000) + 100,
        },
        brand: Math.random() > 0.7 ? getRandomItem(['BrandA', 'BrandB', 'BrandC']) : undefined,
        rating: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 3 : undefined, // 3-5
      },
      sort: {
        field: getRandomItem(['relevance', 'price', 'rating', 'newest']),
        order: getRandomItem(['asc', 'desc']),
      },
      pagination: {
        page: Math.floor(Math.random() * 10) + 1,
        pageSize: getRandomItem([10, 25, 50, 100]),
      },
    },
    context: {
      userId: `user_${Math.random().toString(36).substring(2, 15)}`,
      sessionId: `sess_${Math.random().toString(36).substring(2, 15)}`,
      source: getRandomItem(['web', 'mobile', 'voice']),
    },
  };
}

/**
 * Webhook payload template.
 */
export function generateWebhookPayloadBody() {
  return {
    event: getRandomItem(['order.created', 'user.registered', 'payment.completed', 'item.shipped']),
    timestamp: new Date().toISOString(),
    data: {
      id: Math.random().toString(36).substring(2, 15),
      status: getRandomItem(['pending', 'processing', 'completed', 'failed']),
      amount: parseFloat((Math.random() * 1000).toFixed(2)),
      currency: 'USD',
    },
    metadata: {
      version: '1.0',
      signature: Math.random().toString(36).substring(2, 35),
      attempt: Math.floor(Math.random() * 3) + 1,
    },
  };
}

/**
 * Configuration update request template.
 */
export function generateConfigUpdateBody() {
  return {
    config: {
      features: {
        darkMode: Math.random() > 0.5,
        notifications: Math.random() > 0.3,
        analytics: Math.random() > 0.7,
        betaFeatures: Math.random() > 0.8,
      },
      settings: {
        language: getRandomItem(['en', 'es', 'fr', 'de', 'ja']),
        timezone: getRandomItem([
          'America/New_York',
          'America/Los_Angeles',
          'Europe/London',
          'Asia/Tokyo',
        ]),
        dateFormat: getRandomItem(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
        theme: getRandomItem(['light', 'dark', 'auto']),
      },
      security: {
        twoFactorAuth: Math.random() > 0.7,
        sessionTimeout: getRandomItem([15, 30, 60, 120]),
        ipWhitelist: [],
      },
    },
    updatedBy: `user_${Math.random().toString(36).substring(2, 15)}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get a random request body template based on HTTP method and path.
 */
export function getRandomRequestBody(method: string, path: string): string | undefined {
  // GET, DELETE, HEAD, OPTIONS typically don't have request bodies
  if (['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
    return undefined;
  }

  // Select template based on path
  if (path.includes('register') || path.includes('signup')) {
    return JSON.stringify(generateUserRegistrationBody());
  }

  if (path.includes('product')) {
    return JSON.stringify(generateProductUpdateBody());
  }

  if (path.includes('order')) {
    return JSON.stringify(generateOrderSubmissionBody());
  }

  if (path.includes('review')) {
    return JSON.stringify(generateReviewSubmissionBody());
  }

  if (path.includes('analytics') || path.includes('event')) {
    return JSON.stringify(generateAnalyticsEventBody());
  }

  if (path.includes('oauth') || path.includes('token')) {
    return JSON.stringify(generateOAuthTokenRequestBody());
  }

  if (path.includes('search')) {
    return JSON.stringify(generateSearchQueryBody());
  }

  if (path.includes('webhook')) {
    return JSON.stringify(generateWebhookPayloadBody());
  }

  if (path.includes('config') || path.includes('settings')) {
    return JSON.stringify(generateConfigUpdateBody());
  }

  // Default: random template for POST/PUT/PATCH
  const templates = [
    generateUserRegistrationBody,
    generateProductUpdateBody,
    generateOrderSubmissionBody,
    generateReviewSubmissionBody,
    generateAnalyticsEventBody,
    generateSearchQueryBody,
    generateWebhookPayloadBody,
    generateConfigUpdateBody,
  ];

  const template = getRandomItem(templates);
  return JSON.stringify(template());
}
