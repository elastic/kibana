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

import { PublicJWKS } from '@elastic/request-crypto';

export const telemetryJWKS: PublicJWKS = {
  keys: [
    {
      kty: 'RSA',
      kid: 'kibana',
      use: 'enc',
      alg: 'RSA-OAEP',
      e: 'AQAB',
      n:
        'xYYa5XzvENaAzElCxQurloQM2KEQ058YSjZqmOwa-IN-EZMSUaYPY3qfYCG78ioRaKTHq4mgnkyrDKgjY_1pWKytiRD61FG2ZUeOCwzydnqO8Qpz2vFnibEHkZBRsKkLHgm90RgGpcXfz8vwxkz_nu59aWy5Qr7Ct99H0pEV1HoiCvy5Yw3QfWSAeV-3DWmq_0kX49tqk5yZE-vKnUhNMgqM22lMFTE5-vlaeHgv4ZcvCQx_HrOeea8LyZa5YOdqN-9st0g0G-aWp3CNI2-KJlMUTBAfIAtjwmJ-8QlgeIB1aA7OI2Ceh3kd4dNLesGdLvZ0y4f8IMOsO1dsRWSEsQ',
    },
    {
      kty: 'RSA',
      kid: 'kibana_dev',
      use: 'enc',
      alg: 'RSA-OAEP',
      e: 'AQAB',
      n:
        'juVHivsYFznjrDC449oL3xKVTvux_7dEgBGOgJdfzA2R2GspEAOzupT-VkBnqrJnRP_lznM8bQIvvst1f_DNQ1me_Lr9u9cwL5Vq6SWlmw_u9ur_-ewkShU4tBoJDArksOS-ciTaUJoMaxanb7jWexp0pCDlrLrQyAOCnKQL701mD1gdT4rIw7F-jkb5fLUNUVzOGaGyVy6DHAHZx7Tnyw8rswhyRVvuS73imbRp9XcdOFhBDOeSbrSuZGqrVCjoIlWw-UsiW2ueRd8brBoOIHSmTOMIrIMjpPmzMFRKyCvvhnbjrw8j3fQtFII8urhXCVAw8aIHZhiBc5t9ZuwbJw',
    },
  ],
};
