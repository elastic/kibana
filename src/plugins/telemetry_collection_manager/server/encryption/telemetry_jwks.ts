/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicJWKS } from '@elastic/request-crypto';

export const telemetryJWKS: PublicJWKS = {
  keys: [
    {
      kty: 'RSA',
      kid: 'kibana1',
      use: 'enc',
      alg: 'RSA-OAEP',
      e: 'AQAB',
      n: 'gjwVNVkOqbTZ6QrxdeYbKDnBzhCZGXM97Iq0dXJlpa-7UegcBemI1ALZkbX6AaDrCmqzetsnxJbVz2gr-uzkc97zzjTvPAn-jM-9cfjfsb-nd70qLY7ru3qdyOLb5-ho8cjmjnAp7VaEPuiNOjZ6V6tXq8Cn5LHH8G6K8oZLU1N4RWqkcAvEIlfaLusfMnl15fe7aZkYaKfVFjD-pti_2JGRV9XZ0knRI2oIRMaroBYpfYJxbpR0NLhR7ND6U5WlvxfnaVvRK4c_plVLOtcROqZVn98Z8yZ6GU14vCcvkIBox2D_xd1gSkpMammTQ3tVAEAvoq_wEn_qEbls1Uucgw',
    },
    {
      kty: 'RSA',
      kid: 'kibana_dev1',
      use: 'enc',
      alg: 'RSA-OAEP',
      e: 'AQAB',
      n: 'rEi54h-9hCbqy9Mj_tJmx-dJdtrMmMzkhX5Wd63Pp3dABHpnLJSy--y8QoEa9K9ACaRfExSxgYQ-3K17Yy-UYj3ChAl3hrqZcP2AT3O18Lr2BN7EBjy88lTM0oeck9KLL_iGf8wz8_jeqQFIo3AWrBBuR3VFE0_k-_N1KCenSVm_fE3Nk_ZXm1ByFbgxWUFrYgLfEQn2v0FQYVpfTlbV_awtqoZLYGtuHmaLZhErzJFh6W8zrx8oSpGn8VlVLjF-AR3ugfw2F_HM8ZR8zY1dHVxvoLGz13F5aY8DHn0_ao9t0Yz2Y_SUNviyxMx0eIEJeo2njM2vMzYQNaT1Ghgc-w',
    },
  ],
};
