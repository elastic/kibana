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

export const knownLocales = {
  // Default
  en: { name: 'English' },
  // Americas
  'en-US': { name: 'English (US)', currency: 'USD' },
  'en-CA': { name: 'English (Canadian)', currency: 'CAD' },
  'es-419': { name: 'Spanish (Latin America)', native: 'Español (Latinoamérica)' },
  'fr-CA': { name: 'French (Canada)', native: 'Français (Canadien)', currency: 'CAD' },
  'pt-BR': { name: 'Portuguese (Brazil)', native: 'Português (do Brasil)', currency: 'BRL' },
  // Asia Pacific
  bn: { name: 'Bengali', native: 'বাংলা', currency: 'BDT' },
  fil: { name: 'Filipino', native: 'Pilipino', currency: 'PHP' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', currency: 'INR' },
  hi: { name: 'Hindi', native: 'हिन्दी', currency: 'INR' },
  id: { name: 'Indonesian', native: 'Bahasa Indonesia', currency: 'IDR' },
  ja: { name: 'Japanese', native: '日本語', currency: 'JPY' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', currency: 'INR' },
  ko: { name: 'Korean', native: '한국어', currency: 'KRW' },
  ml: { name: 'Malayalam', native: 'മലയാളം', currency: 'INR' },
  mr: { name: 'Marathi', native: 'मराठी', currency: 'INR' },
  ms: { name: 'Malay', native: 'Bahasa Melayu', currency: 'MYR' },
  si: { name: 'Sinhalese', native: 'සිංහල', currency: 'LKR' },
  ta: { name: 'Tamil', native: 'தமிழ்', currency: 'INR' },
  'ta-LK': { name: 'Tamil (Sri Lanka)', native: 'தமிழ் (இலங்கை)', currency: 'LKR' },
  te: { name: 'Telugu', native: 'తెలుగు', currency: 'INR' },
  th: { name: 'Thai', native: 'ไทย', currency: 'THB' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt', currency: 'VND' },
  'zh-CN': { name: 'Chinese (Simplified)', native: '中文 (简体)', currency: 'CNY' },
  'zh-TW': { name: 'Chinese (Traditional)', native: '正體中文 (繁體)', currency: 'CNY' },
  // Europe
  'en-GB': { name: 'English (British)', native: '', currency: 'GBP' },
  bg: { name: 'Bulgarian', native: 'Български', currency: 'BGN' },
  ca: { name: 'Catalan', native: 'català', currency: 'EUR' },
  cs: { name: 'Czech', native: 'Čeština', currency: 'CZK' },
  da: { name: 'Danish', native: 'Dansk', currency: 'DKK' },
  de: { name: 'German', native: 'Deutsch', currency: 'EUR' },
  el: { name: 'Greek', native: 'Ελληνικά', currency: 'EUR' },
  es: { name: 'Spanish', native: 'Español', currency: 'EUR' },
  et: { name: 'Estonian', native: 'eesti keel', currency: 'EUR' },
  fi: { name: 'Finnish', native: 'suomi', currency: 'EUR' },
  fr: { name: 'French', native: 'Français', currency: 'EUR' },
  hr: { name: 'Croatian', native: 'Hrvatski', currency: 'HRK' },
  hu: { name: 'Hungarian', native: 'Magyar', currency: 'HUF' },
  it: { name: 'Italian', native: 'Italiano', currency: 'EUR' },
  lt: { name: 'Lithuanian', native: 'lietuvių kalba', currency: 'EUR' },
  lv: { name: 'Latvian', native: 'Latv', currency: 'EUR' },
  no: { name: 'Norwegian', native: 'Norsk', currency: 'NOK' },
  'nl-NL': { name: 'Dutch (Netherlands)', native: 'Nederlands', currency: 'EUR' },
  // Dutch (Belgium) has the wrong code in numeral.js, indicating the locale is in Belarus instead of Belgium
  'nl-BE': { name: 'Dutch (Belgium)', native: 'Belgisch-Nederlands', currency: 'EUR' },
  pl: { name: 'Polish', native: 'Polski', currency: 'PLN' },
  'pt-PT': { name: 'Portuguese (Portugal)', native: 'Português (Europeu)', currency: 'EUR' },
  ro: { name: 'Romanian', native: 'română', currency: 'RON' },
  ru: { name: 'Russian', native: 'Русский', currency: 'RUB' },
  sk: { name: 'Slovak', native: 'slovenčina', currency: 'EUR' },
  sl: { name: 'Slovenian', native: 'slovenščina', currency: 'EUR' },
  sr: { name: 'Serbian', native: 'Српски', currency: 'RSD' },
  sv: { name: 'Swedish', native: 'Svenska', currency: 'SEK' },
  tr: { name: 'Turkish', native: 'Türkçe', currency: 'TRY' },
  uk: { name: 'Ukrainian', native: 'Українська', currency: 'UAH' },
  // Middle East and Africa
  ar: { name: 'Arabic', native: 'عربي' },
  fa: { name: 'Persian', native: 'فارسی' },
  he: { name: 'Hebrew', native: 'עברית', currency: 'ILS' },
  sw: { name: 'Swahili', native: 'Kiswahili' },
};
