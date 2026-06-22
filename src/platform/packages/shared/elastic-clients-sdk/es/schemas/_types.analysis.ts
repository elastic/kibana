/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script } from './_global.search'
import { SpecUtilsStringified } from './_spec_utils'
import { VersionString, integer } from './_types'

export const AnalysisStopWordLanguage = z.enum(['_arabic_', '_armenian_', '_basque_', '_bengali_', '_brazilian_', '_bulgarian_', '_catalan_', '_cjk_', '_czech_', '_danish_', '_dutch_', '_english_', '_estonian_', '_finnish_', '_french_', '_galician_', '_german_', '_greek_', '_hindi_', '_hungarian_', '_indonesian_', '_irish_', '_italian_', '_latvian_', '_lithuanian_', '_norwegian_', '_persian_', '_portuguese_', '_romanian_', '_russian_', '_serbian_', '_sorani_', '_spanish_', '_swedish_', '_thai_', '_turkish_', '_none_']).meta({ id: 'AnalysisStopWordLanguage' })
export type AnalysisStopWordLanguage = z.infer<typeof AnalysisStopWordLanguage>

/**
 * Language value, such as _arabic_ or _thai_. Defaults to _english_.
 * Each language value corresponds to a predefined list of stop words in Lucene. See Stop words by language for supported language values and their stop words.
 * Also accepts an array of stop words.
 */
export const AnalysisStopWords = z.union([AnalysisStopWordLanguage, z.array(z.string())]).meta({ id: 'AnalysisStopWords' })
export type AnalysisStopWords = z.infer<typeof AnalysisStopWords>

export const AnalysisCustomAnalyzer = z.object({
  type: z.literal('custom'),
  char_filter: z.union([z.string(), z.array(z.string())]).optional(),
  filter: z.union([z.string(), z.array(z.string())]).optional(),
  position_increment_gap: integer.optional(),
  position_offset_gap: integer.optional(),
  tokenizer: z.string()
}).meta({ id: 'AnalysisCustomAnalyzer' })
export type AnalysisCustomAnalyzer = z.infer<typeof AnalysisCustomAnalyzer>

export const AnalysisFingerprintAnalyzer = z.object({
  type: z.literal('fingerprint'),
  version: VersionString.optional(),
  max_output_size: integer.describe('The maximum token size to emit. Tokens larger than this size will be discarded. Defaults to `255`').optional(),
  separator: z.string().describe('The character to use to concatenate the terms. Defaults to a space.').optional(),
  stopwords: z.lazy(() => AnalysisStopWords).describe('A pre-defined stop words list like `_english_` or an array containing a list of stop words. Defaults to `_none_`.').optional(),
  stopwords_path: z.string().describe('The path to a file containing stop words.').optional()
}).meta({ id: 'AnalysisFingerprintAnalyzer' })
export type AnalysisFingerprintAnalyzer = z.infer<typeof AnalysisFingerprintAnalyzer>

export const AnalysisKeywordAnalyzer = z.object({
  type: z.literal('keyword'),
  version: VersionString.optional()
}).meta({ id: 'AnalysisKeywordAnalyzer' })
export type AnalysisKeywordAnalyzer = z.infer<typeof AnalysisKeywordAnalyzer>

export const AnalysisNoriDecompoundMode = z.enum(['discard', 'none', 'mixed']).meta({ id: 'AnalysisNoriDecompoundMode' })
export type AnalysisNoriDecompoundMode = z.infer<typeof AnalysisNoriDecompoundMode>

export const AnalysisNoriAnalyzer = z.object({
  type: z.literal('nori'),
  version: VersionString.optional(),
  decompound_mode: AnalysisNoriDecompoundMode.optional(),
  stoptags: z.array(z.string()).optional(),
  user_dictionary: z.string().optional()
}).meta({ id: 'AnalysisNoriAnalyzer' })
export type AnalysisNoriAnalyzer = z.infer<typeof AnalysisNoriAnalyzer>

export const AnalysisPatternAnalyzer = z.object({
  type: z.literal('pattern'),
  version: VersionString.optional(),
  flags: z.string().describe('Java regular expression flags. Flags should be pipe-separated, eg "CASE_INSENSITIVE|COMMENTS".').optional(),
  lowercase: z.boolean().describe('Should terms be lowercased or not. Defaults to `true`.').optional(),
  pattern: z.string().describe('A Java regular expression. Defaults to `W+`.').optional(),
  stopwords: z.lazy(() => AnalysisStopWords).describe('A pre-defined stop words list like `_english_` or an array containing a list of stop words. Defaults to `_none_`.').optional(),
  stopwords_path: z.string().describe('The path to a file containing stop words.').optional()
}).meta({ id: 'AnalysisPatternAnalyzer' })
export type AnalysisPatternAnalyzer = z.infer<typeof AnalysisPatternAnalyzer>

export const AnalysisSimpleAnalyzer = z.object({
  type: z.literal('simple'),
  version: VersionString.optional()
}).meta({ id: 'AnalysisSimpleAnalyzer' })
export type AnalysisSimpleAnalyzer = z.infer<typeof AnalysisSimpleAnalyzer>

export const AnalysisStandardAnalyzer = z.object({
  type: z.literal('standard'),
  max_token_length: integer.describe('The maximum token length. If a token is seen that exceeds this length then it is split at `max_token_length` intervals. Defaults to `255`.').optional(),
  stopwords: z.lazy(() => AnalysisStopWords).describe('A pre-defined stop words list like `_english_` or an array containing a list of stop words. Defaults to `_none_`.').optional(),
  stopwords_path: z.string().describe('The path to a file containing stop words.').optional()
}).meta({ id: 'AnalysisStandardAnalyzer' })
export type AnalysisStandardAnalyzer = z.infer<typeof AnalysisStandardAnalyzer>

export const AnalysisStopAnalyzer = z.object({
  type: z.literal('stop'),
  version: VersionString.optional(),
  stopwords: z.lazy(() => AnalysisStopWords).describe('A pre-defined stop words list like `_english_` or an array containing a list of stop words. Defaults to `_none_`.').optional(),
  stopwords_path: z.string().describe('The path to a file containing stop words.').optional()
}).meta({ id: 'AnalysisStopAnalyzer' })
export type AnalysisStopAnalyzer = z.infer<typeof AnalysisStopAnalyzer>

export const AnalysisWhitespaceAnalyzer = z.object({
  type: z.literal('whitespace'),
  version: VersionString.optional()
}).meta({ id: 'AnalysisWhitespaceAnalyzer' })
export type AnalysisWhitespaceAnalyzer = z.infer<typeof AnalysisWhitespaceAnalyzer>

export const AnalysisIcuNormalizationType = z.enum(['nfc', 'nfkc', 'nfkc_cf']).meta({ id: 'AnalysisIcuNormalizationType' })
export type AnalysisIcuNormalizationType = z.infer<typeof AnalysisIcuNormalizationType>

export const AnalysisIcuNormalizationMode = z.enum(['decompose', 'compose']).meta({ id: 'AnalysisIcuNormalizationMode' })
export type AnalysisIcuNormalizationMode = z.infer<typeof AnalysisIcuNormalizationMode>

export const AnalysisIcuAnalyzer = z.object({
  type: z.literal('icu_analyzer'),
  method: AnalysisIcuNormalizationType,
  mode: AnalysisIcuNormalizationMode
}).meta({ id: 'AnalysisIcuAnalyzer' })
export type AnalysisIcuAnalyzer = z.infer<typeof AnalysisIcuAnalyzer>

export const AnalysisKuromojiTokenizationMode = z.enum(['normal', 'search', 'extended']).meta({ id: 'AnalysisKuromojiTokenizationMode' })
export type AnalysisKuromojiTokenizationMode = z.infer<typeof AnalysisKuromojiTokenizationMode>

export const AnalysisKuromojiAnalyzer = z.object({
  type: z.literal('kuromoji'),
  mode: AnalysisKuromojiTokenizationMode.optional(),
  user_dictionary: z.string().optional()
}).meta({ id: 'AnalysisKuromojiAnalyzer' })
export type AnalysisKuromojiAnalyzer = z.infer<typeof AnalysisKuromojiAnalyzer>

export const AnalysisSnowballLanguage = z.enum(['Arabic', 'Armenian', 'Basque', 'Catalan', 'Danish', 'Dutch', 'English', 'Estonian', 'Finnish', 'French', 'German', 'German2', 'Hungarian', 'Italian', 'Irish', 'Kp', 'Lithuanian', 'Lovins', 'Norwegian', 'Porter', 'Portuguese', 'Romanian', 'Russian', 'Serbian', 'Spanish', 'Swedish', 'Turkish']).meta({ id: 'AnalysisSnowballLanguage' })
export type AnalysisSnowballLanguage = z.infer<typeof AnalysisSnowballLanguage>

export const AnalysisSnowballAnalyzer = z.object({
  type: z.literal('snowball'),
  version: VersionString.optional(),
  language: AnalysisSnowballLanguage,
  stopwords: z.lazy(() => AnalysisStopWords).optional()
}).meta({ id: 'AnalysisSnowballAnalyzer' })
export type AnalysisSnowballAnalyzer = z.infer<typeof AnalysisSnowballAnalyzer>

export const AnalysisArabicAnalyzer = z.object({
  type: z.literal('arabic'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisArabicAnalyzer' })
export type AnalysisArabicAnalyzer = z.infer<typeof AnalysisArabicAnalyzer>

export const AnalysisArmenianAnalyzer = z.object({
  type: z.literal('armenian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisArmenianAnalyzer' })
export type AnalysisArmenianAnalyzer = z.infer<typeof AnalysisArmenianAnalyzer>

export const AnalysisBasqueAnalyzer = z.object({
  type: z.literal('basque'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisBasqueAnalyzer' })
export type AnalysisBasqueAnalyzer = z.infer<typeof AnalysisBasqueAnalyzer>

export const AnalysisBengaliAnalyzer = z.object({
  type: z.literal('bengali'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisBengaliAnalyzer' })
export type AnalysisBengaliAnalyzer = z.infer<typeof AnalysisBengaliAnalyzer>

export const AnalysisBrazilianAnalyzer = z.object({
  type: z.literal('brazilian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisBrazilianAnalyzer' })
export type AnalysisBrazilianAnalyzer = z.infer<typeof AnalysisBrazilianAnalyzer>

export const AnalysisBulgarianAnalyzer = z.object({
  type: z.literal('bulgarian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisBulgarianAnalyzer' })
export type AnalysisBulgarianAnalyzer = z.infer<typeof AnalysisBulgarianAnalyzer>

export const AnalysisCatalanAnalyzer = z.object({
  type: z.literal('catalan'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisCatalanAnalyzer' })
export type AnalysisCatalanAnalyzer = z.infer<typeof AnalysisCatalanAnalyzer>

export const AnalysisChineseAnalyzer = z.object({
  type: z.literal('chinese'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisChineseAnalyzer' })
export type AnalysisChineseAnalyzer = z.infer<typeof AnalysisChineseAnalyzer>

export const AnalysisCjkAnalyzer = z.object({
  type: z.literal('cjk'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisCjkAnalyzer' })
export type AnalysisCjkAnalyzer = z.infer<typeof AnalysisCjkAnalyzer>

export const AnalysisCzechAnalyzer = z.object({
  type: z.literal('czech'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisCzechAnalyzer' })
export type AnalysisCzechAnalyzer = z.infer<typeof AnalysisCzechAnalyzer>

export const AnalysisDanishAnalyzer = z.object({
  type: z.literal('danish'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisDanishAnalyzer' })
export type AnalysisDanishAnalyzer = z.infer<typeof AnalysisDanishAnalyzer>

export const AnalysisDutchAnalyzer = z.object({
  type: z.literal('dutch'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisDutchAnalyzer' })
export type AnalysisDutchAnalyzer = z.infer<typeof AnalysisDutchAnalyzer>

export const AnalysisEnglishAnalyzer = z.object({
  type: z.literal('english'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisEnglishAnalyzer' })
export type AnalysisEnglishAnalyzer = z.infer<typeof AnalysisEnglishAnalyzer>

export const AnalysisEstonianAnalyzer = z.object({
  type: z.literal('estonian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisEstonianAnalyzer' })
export type AnalysisEstonianAnalyzer = z.infer<typeof AnalysisEstonianAnalyzer>

export const AnalysisFinnishAnalyzer = z.object({
  type: z.literal('finnish'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisFinnishAnalyzer' })
export type AnalysisFinnishAnalyzer = z.infer<typeof AnalysisFinnishAnalyzer>

export const AnalysisFrenchAnalyzer = z.object({
  type: z.literal('french'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisFrenchAnalyzer' })
export type AnalysisFrenchAnalyzer = z.infer<typeof AnalysisFrenchAnalyzer>

export const AnalysisGalicianAnalyzer = z.object({
  type: z.literal('galician'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisGalicianAnalyzer' })
export type AnalysisGalicianAnalyzer = z.infer<typeof AnalysisGalicianAnalyzer>

export const AnalysisGermanAnalyzer = z.object({
  type: z.literal('german'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisGermanAnalyzer' })
export type AnalysisGermanAnalyzer = z.infer<typeof AnalysisGermanAnalyzer>

export const AnalysisGreekAnalyzer = z.object({
  type: z.literal('greek'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisGreekAnalyzer' })
export type AnalysisGreekAnalyzer = z.infer<typeof AnalysisGreekAnalyzer>

export const AnalysisHindiAnalyzer = z.object({
  type: z.literal('hindi'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisHindiAnalyzer' })
export type AnalysisHindiAnalyzer = z.infer<typeof AnalysisHindiAnalyzer>

export const AnalysisHungarianAnalyzer = z.object({
  type: z.literal('hungarian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisHungarianAnalyzer' })
export type AnalysisHungarianAnalyzer = z.infer<typeof AnalysisHungarianAnalyzer>

export const AnalysisIndonesianAnalyzer = z.object({
  type: z.literal('indonesian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisIndonesianAnalyzer' })
export type AnalysisIndonesianAnalyzer = z.infer<typeof AnalysisIndonesianAnalyzer>

export const AnalysisIrishAnalyzer = z.object({
  type: z.literal('irish'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisIrishAnalyzer' })
export type AnalysisIrishAnalyzer = z.infer<typeof AnalysisIrishAnalyzer>

export const AnalysisItalianAnalyzer = z.object({
  type: z.literal('italian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisItalianAnalyzer' })
export type AnalysisItalianAnalyzer = z.infer<typeof AnalysisItalianAnalyzer>

export const AnalysisLatvianAnalyzer = z.object({
  type: z.literal('latvian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisLatvianAnalyzer' })
export type AnalysisLatvianAnalyzer = z.infer<typeof AnalysisLatvianAnalyzer>

export const AnalysisLithuanianAnalyzer = z.object({
  type: z.literal('lithuanian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisLithuanianAnalyzer' })
export type AnalysisLithuanianAnalyzer = z.infer<typeof AnalysisLithuanianAnalyzer>

export const AnalysisNorwegianAnalyzer = z.object({
  type: z.literal('norwegian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisNorwegianAnalyzer' })
export type AnalysisNorwegianAnalyzer = z.infer<typeof AnalysisNorwegianAnalyzer>

export const AnalysisPersianAnalyzer = z.object({
  type: z.literal('persian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisPersianAnalyzer' })
export type AnalysisPersianAnalyzer = z.infer<typeof AnalysisPersianAnalyzer>

export const AnalysisPortugueseAnalyzer = z.object({
  type: z.literal('portuguese'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisPortugueseAnalyzer' })
export type AnalysisPortugueseAnalyzer = z.infer<typeof AnalysisPortugueseAnalyzer>

export const AnalysisRomanianAnalyzer = z.object({
  type: z.literal('romanian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisRomanianAnalyzer' })
export type AnalysisRomanianAnalyzer = z.infer<typeof AnalysisRomanianAnalyzer>

export const AnalysisRussianAnalyzer = z.object({
  type: z.literal('russian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisRussianAnalyzer' })
export type AnalysisRussianAnalyzer = z.infer<typeof AnalysisRussianAnalyzer>

export const AnalysisSerbianAnalyzer = z.object({
  type: z.literal('serbian'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisSerbianAnalyzer' })
export type AnalysisSerbianAnalyzer = z.infer<typeof AnalysisSerbianAnalyzer>

export const AnalysisSoraniAnalyzer = z.object({
  type: z.literal('sorani'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisSoraniAnalyzer' })
export type AnalysisSoraniAnalyzer = z.infer<typeof AnalysisSoraniAnalyzer>

export const AnalysisSpanishAnalyzer = z.object({
  type: z.literal('spanish'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisSpanishAnalyzer' })
export type AnalysisSpanishAnalyzer = z.infer<typeof AnalysisSpanishAnalyzer>

export const AnalysisSwedishAnalyzer = z.object({
  type: z.literal('swedish'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisSwedishAnalyzer' })
export type AnalysisSwedishAnalyzer = z.infer<typeof AnalysisSwedishAnalyzer>

export const AnalysisTurkishAnalyzer = z.object({
  type: z.literal('turkish'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional(),
  stem_exclusion: z.array(z.string()).optional()
}).meta({ id: 'AnalysisTurkishAnalyzer' })
export type AnalysisTurkishAnalyzer = z.infer<typeof AnalysisTurkishAnalyzer>

export const AnalysisThaiAnalyzer = z.object({
  type: z.literal('thai'),
  stopwords: z.lazy(() => AnalysisStopWords).optional(),
  stopwords_path: z.string().optional()
}).meta({ id: 'AnalysisThaiAnalyzer' })
export type AnalysisThaiAnalyzer = z.infer<typeof AnalysisThaiAnalyzer>

export const AnalysisAnalyzer = z.union([AnalysisCustomAnalyzer, AnalysisFingerprintAnalyzer, AnalysisKeywordAnalyzer, AnalysisNoriAnalyzer, AnalysisPatternAnalyzer, AnalysisSimpleAnalyzer, AnalysisStandardAnalyzer, AnalysisStopAnalyzer, AnalysisWhitespaceAnalyzer, AnalysisIcuAnalyzer, AnalysisKuromojiAnalyzer, AnalysisSnowballAnalyzer, AnalysisArabicAnalyzer, AnalysisArmenianAnalyzer, AnalysisBasqueAnalyzer, AnalysisBengaliAnalyzer, AnalysisBrazilianAnalyzer, AnalysisBulgarianAnalyzer, AnalysisCatalanAnalyzer, AnalysisChineseAnalyzer, AnalysisCjkAnalyzer, AnalysisCzechAnalyzer, AnalysisDanishAnalyzer, AnalysisDutchAnalyzer, AnalysisEnglishAnalyzer, AnalysisEstonianAnalyzer, AnalysisFinnishAnalyzer, AnalysisFrenchAnalyzer, AnalysisGalicianAnalyzer, AnalysisGermanAnalyzer, AnalysisGreekAnalyzer, AnalysisHindiAnalyzer, AnalysisHungarianAnalyzer, AnalysisIndonesianAnalyzer, AnalysisIrishAnalyzer, AnalysisItalianAnalyzer, AnalysisLatvianAnalyzer, AnalysisLithuanianAnalyzer, AnalysisNorwegianAnalyzer, AnalysisPersianAnalyzer, AnalysisPortugueseAnalyzer, AnalysisRomanianAnalyzer, AnalysisRussianAnalyzer, AnalysisSerbianAnalyzer, AnalysisSoraniAnalyzer, AnalysisSpanishAnalyzer, AnalysisSwedishAnalyzer, AnalysisTurkishAnalyzer, AnalysisThaiAnalyzer]).meta({ id: 'AnalysisAnalyzer' })
export type AnalysisAnalyzer = z.infer<typeof AnalysisAnalyzer>

export const AnalysisTokenFilterBase = z.object({
  version: VersionString.optional()
}).meta({ id: 'AnalysisTokenFilterBase' })
export type AnalysisTokenFilterBase = z.infer<typeof AnalysisTokenFilterBase>

export const AnalysisApostropheTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('apostrophe')
}).meta({ id: 'AnalysisApostropheTokenFilter' })
export type AnalysisApostropheTokenFilter = z.infer<typeof AnalysisApostropheTokenFilter>

export const AnalysisArabicNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('arabic_normalization')
}).meta({ id: 'AnalysisArabicNormalizationTokenFilter' })
export type AnalysisArabicNormalizationTokenFilter = z.infer<typeof AnalysisArabicNormalizationTokenFilter>

export const AnalysisArabicStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('arabic_stem')
}).meta({ id: 'AnalysisArabicStemTokenFilter' })
export type AnalysisArabicStemTokenFilter = z.infer<typeof AnalysisArabicStemTokenFilter>

export const AnalysisAsciiFoldingTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('asciifolding'),
  preserve_original: SpecUtilsStringified.describe('If `true`, emit both original tokens and folded tokens. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisAsciiFoldingTokenFilter' })
export type AnalysisAsciiFoldingTokenFilter = z.infer<typeof AnalysisAsciiFoldingTokenFilter>

export const AnalysisBengaliNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('bengali_normalization')
}).meta({ id: 'AnalysisBengaliNormalizationTokenFilter' })
export type AnalysisBengaliNormalizationTokenFilter = z.infer<typeof AnalysisBengaliNormalizationTokenFilter>

export const AnalysisBrazilianStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('brazilian_stem')
}).meta({ id: 'AnalysisBrazilianStemTokenFilter' })
export type AnalysisBrazilianStemTokenFilter = z.infer<typeof AnalysisBrazilianStemTokenFilter>

export const AnalysisCharFilterBase = z.object({
  version: VersionString.optional()
}).meta({ id: 'AnalysisCharFilterBase' })
export type AnalysisCharFilterBase = z.infer<typeof AnalysisCharFilterBase>

export const AnalysisHtmlStripCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('html_strip'),
  escaped_tags: z.array(z.string()).optional()
}).meta({ id: 'AnalysisHtmlStripCharFilter' })
export type AnalysisHtmlStripCharFilter = z.infer<typeof AnalysisHtmlStripCharFilter>

export const AnalysisMappingCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('mapping'),
  mappings: z.array(z.string()).optional(),
  mappings_path: z.string().optional()
}).meta({ id: 'AnalysisMappingCharFilter' })
export type AnalysisMappingCharFilter = z.infer<typeof AnalysisMappingCharFilter>

export const AnalysisPatternReplaceCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('pattern_replace'),
  flags: z.string().optional(),
  pattern: z.string(),
  replacement: z.string().optional()
}).meta({ id: 'AnalysisPatternReplaceCharFilter' })
export type AnalysisPatternReplaceCharFilter = z.infer<typeof AnalysisPatternReplaceCharFilter>

export const AnalysisIcuNormalizationCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('icu_normalizer'),
  mode: AnalysisIcuNormalizationMode.optional(),
  name: AnalysisIcuNormalizationType.optional(),
  unicode_set_filter: z.string().optional()
}).meta({ id: 'AnalysisIcuNormalizationCharFilter' })
export type AnalysisIcuNormalizationCharFilter = z.infer<typeof AnalysisIcuNormalizationCharFilter>

export const AnalysisKuromojiIterationMarkCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('kuromoji_iteration_mark'),
  normalize_kana: z.boolean(),
  normalize_kanji: z.boolean()
}).meta({ id: 'AnalysisKuromojiIterationMarkCharFilter' })
export type AnalysisKuromojiIterationMarkCharFilter = z.infer<typeof AnalysisKuromojiIterationMarkCharFilter>

export const AnalysisCharFilterDefinition = z.union([AnalysisHtmlStripCharFilter, AnalysisMappingCharFilter, AnalysisPatternReplaceCharFilter, AnalysisIcuNormalizationCharFilter, AnalysisKuromojiIterationMarkCharFilter]).meta({ id: 'AnalysisCharFilterDefinition' })
export type AnalysisCharFilterDefinition = z.infer<typeof AnalysisCharFilterDefinition>

export const AnalysisCharFilter = z.union([z.string(), AnalysisCharFilterDefinition]).meta({ id: 'AnalysisCharFilter' })
export type AnalysisCharFilter = z.infer<typeof AnalysisCharFilter>

export const AnalysisTokenizerBase = z.object({
  version: VersionString.optional()
}).meta({ id: 'AnalysisTokenizerBase' })
export type AnalysisTokenizerBase = z.infer<typeof AnalysisTokenizerBase>

export const AnalysisCharGroupTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('char_group'),
  tokenize_on_chars: z.array(z.string()),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisCharGroupTokenizer' })
export type AnalysisCharGroupTokenizer = z.infer<typeof AnalysisCharGroupTokenizer>

export const AnalysisCjkBigramIgnoredScript = z.enum(['han', 'hangul', 'hiragana', 'katakana']).meta({ id: 'AnalysisCjkBigramIgnoredScript' })
export type AnalysisCjkBigramIgnoredScript = z.infer<typeof AnalysisCjkBigramIgnoredScript>

export const AnalysisCjkBigramTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('cjk_bigram'),
  ignored_scripts: z.array(AnalysisCjkBigramIgnoredScript).describe('Array of character scripts for which to disable bigrams.').optional(),
  output_unigrams: z.boolean().describe('If `true`, emit tokens in both bigram and unigram form. If `false`, a CJK character is output in unigram form when it has no adjacent characters. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisCjkBigramTokenFilter' })
export type AnalysisCjkBigramTokenFilter = z.infer<typeof AnalysisCjkBigramTokenFilter>

export const AnalysisCjkWidthTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('cjk_width')
}).meta({ id: 'AnalysisCjkWidthTokenFilter' })
export type AnalysisCjkWidthTokenFilter = z.infer<typeof AnalysisCjkWidthTokenFilter>

export const AnalysisClassicTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('classic')
}).meta({ id: 'AnalysisClassicTokenFilter' })
export type AnalysisClassicTokenFilter = z.infer<typeof AnalysisClassicTokenFilter>

export const AnalysisClassicTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('classic'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisClassicTokenizer' })
export type AnalysisClassicTokenizer = z.infer<typeof AnalysisClassicTokenizer>

export const AnalysisCommonGramsTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('common_grams'),
  common_words: z.array(z.string()).describe('A list of tokens. The filter generates bigrams for these tokens. Either this or the `common_words_path` parameter is required.').optional(),
  common_words_path: z.string().describe('Path to a file containing a list of tokens. The filter generates bigrams for these tokens. This path must be absolute or relative to the `config` location. The file must be UTF-8 encoded. Each token in the file must be separated by a line break. Either this or the `common_words` parameter is required.').optional(),
  ignore_case: z.boolean().describe('If `true`, matches for common words matching are case-insensitive. Defaults to `false`.').optional(),
  query_mode: z.boolean().describe('If `true`, the filter excludes the following tokens from the output: - Unigrams for common words - Unigrams for terms followed by common words Defaults to `false`. We recommend enabling this parameter for search analyzers.').optional()
}).meta({ id: 'AnalysisCommonGramsTokenFilter' })
export type AnalysisCommonGramsTokenFilter = z.infer<typeof AnalysisCommonGramsTokenFilter>

export const AnalysisCompoundWordTokenFilterBase = z.object({
  ...AnalysisTokenFilterBase.shape,
  max_subword_size: integer.describe('Maximum subword character length. Longer subword tokens are excluded from the output. Defaults to `15`.').optional(),
  min_subword_size: integer.describe('Minimum subword character length. Shorter subword tokens are excluded from the output. Defaults to `2`.').optional(),
  min_word_size: integer.describe('Minimum word character length. Shorter word tokens are excluded from the output. Defaults to `5`.').optional(),
  only_longest_match: z.boolean().describe('If `true`, only include the longest matching subword. Defaults to `false`.').optional(),
  word_list: z.array(z.string()).describe('A list of subwords to look for in the token stream. If found, the subword is included in the token output. Either this parameter or `word_list_path` must be specified.').optional(),
  word_list_path: z.string().describe('Path to a file that contains a list of subwords to find in the token stream. If found, the subword is included in the token output. This path must be absolute or relative to the config location, and the file must be UTF-8 encoded. Each token in the file must be separated by a line break. Either this parameter or `word_list` must be specified.').optional()
}).meta({ id: 'AnalysisCompoundWordTokenFilterBase' })
export type AnalysisCompoundWordTokenFilterBase = z.infer<typeof AnalysisCompoundWordTokenFilterBase>

export const AnalysisConditionTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('condition'),
  filter: z.array(z.string()).describe('Array of token filters. If a token matches the predicate script in the `script` parameter, these filters are applied to the token in the order provided.'),
  script: z.lazy(() => Script).describe('Predicate script used to apply token filters. If a token matches this script, the filters in the `filter` parameter are applied to the token.')
}).meta({ id: 'AnalysisConditionTokenFilter' })
export type AnalysisConditionTokenFilter = z.infer<typeof AnalysisConditionTokenFilter>

export const AnalysisCustomNormalizer = z.object({
  type: z.literal('custom'),
  char_filter: z.array(z.string()).optional(),
  filter: z.array(z.string()).optional()
}).meta({ id: 'AnalysisCustomNormalizer' })
export type AnalysisCustomNormalizer = z.infer<typeof AnalysisCustomNormalizer>

export const AnalysisCzechStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('czech_stem')
}).meta({ id: 'AnalysisCzechStemTokenFilter' })
export type AnalysisCzechStemTokenFilter = z.infer<typeof AnalysisCzechStemTokenFilter>

export const AnalysisDecimalDigitTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('decimal_digit')
}).meta({ id: 'AnalysisDecimalDigitTokenFilter' })
export type AnalysisDecimalDigitTokenFilter = z.infer<typeof AnalysisDecimalDigitTokenFilter>

export const AnalysisDelimitedPayloadEncoding = z.enum(['int', 'float', 'identity']).meta({ id: 'AnalysisDelimitedPayloadEncoding' })
export type AnalysisDelimitedPayloadEncoding = z.infer<typeof AnalysisDelimitedPayloadEncoding>

export const AnalysisDelimitedPayloadTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('delimited_payload'),
  delimiter: z.string().describe('Character used to separate tokens from payloads. Defaults to `|`.').optional(),
  encoding: AnalysisDelimitedPayloadEncoding.describe('Data type for the stored payload.').optional()
}).meta({ id: 'AnalysisDelimitedPayloadTokenFilter' })
export type AnalysisDelimitedPayloadTokenFilter = z.infer<typeof AnalysisDelimitedPayloadTokenFilter>

export const AnalysisDictionaryDecompounderTokenFilter = z.object({
  ...AnalysisCompoundWordTokenFilterBase.shape,
  type: z.literal('dictionary_decompounder')
}).meta({ id: 'AnalysisDictionaryDecompounderTokenFilter' })
export type AnalysisDictionaryDecompounderTokenFilter = z.infer<typeof AnalysisDictionaryDecompounderTokenFilter>

export const AnalysisDutchStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('dutch_stem')
}).meta({ id: 'AnalysisDutchStemTokenFilter' })
export type AnalysisDutchStemTokenFilter = z.infer<typeof AnalysisDutchStemTokenFilter>

export const AnalysisEdgeNGramSide = z.enum(['front', 'back']).meta({ id: 'AnalysisEdgeNGramSide' })
export type AnalysisEdgeNGramSide = z.infer<typeof AnalysisEdgeNGramSide>

export const AnalysisEdgeNGramTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('edge_ngram'),
  max_gram: integer.describe('Maximum character length of a gram. For custom token filters, defaults to `2`. For the built-in edge_ngram filter, defaults to `1`.').optional(),
  min_gram: integer.describe('Minimum character length of a gram. Defaults to `1`.').optional(),
  side: AnalysisEdgeNGramSide.describe('Indicates whether to truncate tokens from the `front` or `back`. Defaults to `front`.').optional(),
  preserve_original: SpecUtilsStringified.describe('Emits original token when set to `true`. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisEdgeNGramTokenFilter' })
export type AnalysisEdgeNGramTokenFilter = z.infer<typeof AnalysisEdgeNGramTokenFilter>

export const AnalysisTokenChar = z.enum(['letter', 'digit', 'whitespace', 'punctuation', 'symbol', 'custom']).meta({ id: 'AnalysisTokenChar' })
export type AnalysisTokenChar = z.infer<typeof AnalysisTokenChar>

export const AnalysisEdgeNGramTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('edge_ngram'),
  custom_token_chars: z.string().optional(),
  max_gram: integer.optional(),
  min_gram: integer.optional(),
  token_chars: z.array(AnalysisTokenChar).optional()
}).meta({ id: 'AnalysisEdgeNGramTokenizer' })
export type AnalysisEdgeNGramTokenizer = z.infer<typeof AnalysisEdgeNGramTokenizer>

export const AnalysisElisionTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('elision'),
  articles: z.array(z.string()).describe('List of elisions to remove. To be removed, the elision must be at the beginning of a token and be immediately followed by an apostrophe. Both the elision and apostrophe are removed. For custom `elision` filters, either this parameter or `articles_path` must be specified.').optional(),
  articles_path: z.string().describe('Path to a file that contains a list of elisions to remove. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each elision in the file must be separated by a line break. To be removed, the elision must be at the beginning of a token and be immediately followed by an apostrophe. Both the elision and apostrophe are removed. For custom `elision` filters, either this parameter or `articles` must be specified.').optional(),
  articles_case: SpecUtilsStringified.describe('If `true`, elision matching is case insensitive. If `false`, elision matching is case sensitive. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisElisionTokenFilter' })
export type AnalysisElisionTokenFilter = z.infer<typeof AnalysisElisionTokenFilter>

export const AnalysisFingerprintTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('fingerprint'),
  max_output_size: integer.describe('Maximum character length, including whitespace, of the output token. Defaults to `255`. Concatenated tokens longer than this will result in no token output.').optional(),
  separator: z.string().describe('Character to use to concatenate the token stream input. Defaults to a space.').optional()
}).meta({ id: 'AnalysisFingerprintTokenFilter' })
export type AnalysisFingerprintTokenFilter = z.infer<typeof AnalysisFingerprintTokenFilter>

export const AnalysisFlattenGraphTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('flatten_graph')
}).meta({ id: 'AnalysisFlattenGraphTokenFilter' })
export type AnalysisFlattenGraphTokenFilter = z.infer<typeof AnalysisFlattenGraphTokenFilter>

export const AnalysisFrenchStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('french_stem')
}).meta({ id: 'AnalysisFrenchStemTokenFilter' })
export type AnalysisFrenchStemTokenFilter = z.infer<typeof AnalysisFrenchStemTokenFilter>

export const AnalysisGermanNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('german_normalization')
}).meta({ id: 'AnalysisGermanNormalizationTokenFilter' })
export type AnalysisGermanNormalizationTokenFilter = z.infer<typeof AnalysisGermanNormalizationTokenFilter>

export const AnalysisGermanStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('german_stem')
}).meta({ id: 'AnalysisGermanStemTokenFilter' })
export type AnalysisGermanStemTokenFilter = z.infer<typeof AnalysisGermanStemTokenFilter>

export const AnalysisHindiNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('hindi_normalization')
}).meta({ id: 'AnalysisHindiNormalizationTokenFilter' })
export type AnalysisHindiNormalizationTokenFilter = z.infer<typeof AnalysisHindiNormalizationTokenFilter>

export const AnalysisHunspellTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('hunspell'),
  dedup: z.boolean().describe('If `true`, duplicate tokens are removed from the filter’s output. Defaults to `true`.').optional(),
  dictionary: z.string().describe('One or more `.dic` files (e.g, `en_US.dic`, my_custom.dic) to use for the Hunspell dictionary. By default, the `hunspell` filter uses all `.dic` files in the `<$ES_PATH_CONF>/hunspell/<locale>` directory specified using the `lang`, `language`, or `locale` parameter.').optional(),
  locale: z.string().describe('Locale directory used to specify the `.aff` and `.dic` files for a Hunspell dictionary.'),
  lang: z.string().describe('Locale directory used to specify the `.aff` and `.dic` files for a Hunspell dictionary.'),
  language: z.string().describe('Locale directory used to specify the `.aff` and `.dic` files for a Hunspell dictionary.'),
  longest_only: z.boolean().describe('If `true`, only the longest stemmed version of each token is included in the output. If `false`, all stemmed versions of the token are included. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisHunspellTokenFilter' })
export type AnalysisHunspellTokenFilter = z.infer<typeof AnalysisHunspellTokenFilter>

export const AnalysisHyphenationDecompounderTokenFilter = z.object({
  ...AnalysisCompoundWordTokenFilterBase.shape,
  type: z.literal('hyphenation_decompounder'),
  hyphenation_patterns_path: z.string().describe('Path to an Apache FOP (Formatting Objects Processor) XML hyphenation pattern file. This path must be absolute or relative to the `config` location. Only FOP v1.2 compatible files are supported.'),
  no_sub_matches: z.boolean().describe('If `true`, do not match sub tokens in tokens that are in the word list. Defaults to `false`.').optional(),
  no_overlapping_matches: z.boolean().describe('If `true`, do not allow overlapping tokens. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisHyphenationDecompounderTokenFilter' })
export type AnalysisHyphenationDecompounderTokenFilter = z.infer<typeof AnalysisHyphenationDecompounderTokenFilter>

export const AnalysisIcuCollationAlternate = z.enum(['shifted', 'non-ignorable']).meta({ id: 'AnalysisIcuCollationAlternate' })
export type AnalysisIcuCollationAlternate = z.infer<typeof AnalysisIcuCollationAlternate>

export const AnalysisIcuCollationCaseFirst = z.enum(['lower', 'upper']).meta({ id: 'AnalysisIcuCollationCaseFirst' })
export type AnalysisIcuCollationCaseFirst = z.infer<typeof AnalysisIcuCollationCaseFirst>

export const AnalysisIcuCollationDecomposition = z.enum(['no', 'identical']).meta({ id: 'AnalysisIcuCollationDecomposition' })
export type AnalysisIcuCollationDecomposition = z.infer<typeof AnalysisIcuCollationDecomposition>

export const AnalysisIcuCollationStrength = z.enum(['primary', 'secondary', 'tertiary', 'quaternary', 'identical']).meta({ id: 'AnalysisIcuCollationStrength' })
export type AnalysisIcuCollationStrength = z.infer<typeof AnalysisIcuCollationStrength>

export const AnalysisIcuCollationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_collation'),
  alternate: z.lazy(() => AnalysisIcuCollationAlternate).optional(),
  caseFirst: z.lazy(() => AnalysisIcuCollationCaseFirst).optional(),
  caseLevel: z.boolean().optional(),
  country: z.string().optional(),
  decomposition: z.lazy(() => AnalysisIcuCollationDecomposition).optional(),
  hiraganaQuaternaryMode: z.boolean().optional(),
  language: z.string().optional(),
  numeric: z.boolean().optional(),
  rules: z.string().optional(),
  strength: z.lazy(() => AnalysisIcuCollationStrength).optional(),
  variableTop: z.string().optional(),
  variant: z.string().optional()
}).meta({ id: 'AnalysisIcuCollationTokenFilter' })
export type AnalysisIcuCollationTokenFilter = z.infer<typeof AnalysisIcuCollationTokenFilter>

export const AnalysisIcuFoldingTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_folding'),
  unicode_set_filter: z.string()
}).meta({ id: 'AnalysisIcuFoldingTokenFilter' })
export type AnalysisIcuFoldingTokenFilter = z.infer<typeof AnalysisIcuFoldingTokenFilter>

export const AnalysisIcuNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_normalizer'),
  name: AnalysisIcuNormalizationType
}).meta({ id: 'AnalysisIcuNormalizationTokenFilter' })
export type AnalysisIcuNormalizationTokenFilter = z.infer<typeof AnalysisIcuNormalizationTokenFilter>

export const AnalysisIcuTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('icu_tokenizer'),
  rule_files: z.string()
}).meta({ id: 'AnalysisIcuTokenizer' })
export type AnalysisIcuTokenizer = z.infer<typeof AnalysisIcuTokenizer>

export const AnalysisIcuTransformDirection = z.enum(['forward', 'reverse']).meta({ id: 'AnalysisIcuTransformDirection' })
export type AnalysisIcuTransformDirection = z.infer<typeof AnalysisIcuTransformDirection>

export const AnalysisIcuTransformTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_transform'),
  dir: AnalysisIcuTransformDirection.optional(),
  id: z.string()
}).meta({ id: 'AnalysisIcuTransformTokenFilter' })
export type AnalysisIcuTransformTokenFilter = z.infer<typeof AnalysisIcuTransformTokenFilter>

export const AnalysisIndicNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('indic_normalization')
}).meta({ id: 'AnalysisIndicNormalizationTokenFilter' })
export type AnalysisIndicNormalizationTokenFilter = z.infer<typeof AnalysisIndicNormalizationTokenFilter>

export const AnalysisJaStopTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('ja_stop'),
  stopwords: z.lazy(() => AnalysisStopWords).optional()
}).meta({ id: 'AnalysisJaStopTokenFilter' })
export type AnalysisJaStopTokenFilter = z.infer<typeof AnalysisJaStopTokenFilter>

export const AnalysisKStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kstem')
}).meta({ id: 'AnalysisKStemTokenFilter' })
export type AnalysisKStemTokenFilter = z.infer<typeof AnalysisKStemTokenFilter>

export const AnalysisKeepTypesMode = z.enum(['include', 'exclude']).meta({ id: 'AnalysisKeepTypesMode' })
export type AnalysisKeepTypesMode = z.infer<typeof AnalysisKeepTypesMode>

export const AnalysisKeepTypesTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keep_types'),
  mode: AnalysisKeepTypesMode.describe('Indicates whether to keep or remove the specified token types.').optional(),
  types: z.array(z.string()).describe('List of token types to keep or remove.')
}).meta({ id: 'AnalysisKeepTypesTokenFilter' })
export type AnalysisKeepTypesTokenFilter = z.infer<typeof AnalysisKeepTypesTokenFilter>

export const AnalysisKeepWordsTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keep'),
  keep_words: z.array(z.string()).describe('List of words to keep. Only tokens that match words in this list are included in the output. Either this parameter or `keep_words_path` must be specified.').optional(),
  keep_words_case: z.boolean().describe('If `true`, lowercase all keep words. Defaults to `false`.').optional(),
  keep_words_path: z.string().describe('Path to a file that contains a list of words to keep. Only tokens that match words in this list are included in the output. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each word in the file must be separated by a line break. Either this parameter or `keep_words` must be specified.').optional()
}).meta({ id: 'AnalysisKeepWordsTokenFilter' })
export type AnalysisKeepWordsTokenFilter = z.infer<typeof AnalysisKeepWordsTokenFilter>

export const AnalysisKeywordMarkerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keyword_marker'),
  ignore_case: z.boolean().describe('If `true`, matching for the `keywords` and `keywords_path` parameters ignores letter case. Defaults to `false`.').optional(),
  keywords: z.union([z.string(), z.array(z.string())]).describe('Array of keywords. Tokens that match these keywords are not stemmed. This parameter, `keywords_path`, or `keywords_pattern` must be specified. You cannot specify this parameter and `keywords_pattern`.').optional(),
  keywords_path: z.string().describe('Path to a file that contains a list of keywords. Tokens that match these keywords are not stemmed. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each word in the file must be separated by a line break. This parameter, `keywords`, or `keywords_pattern` must be specified. You cannot specify this parameter and `keywords_pattern`.').optional(),
  keywords_pattern: z.string().describe('Java regular expression used to match tokens. Tokens that match this expression are marked as keywords and not stemmed. This parameter, `keywords`, or `keywords_path` must be specified. You cannot specify this parameter and `keywords` or `keywords_pattern`.').optional()
}).meta({ id: 'AnalysisKeywordMarkerTokenFilter' })
export type AnalysisKeywordMarkerTokenFilter = z.infer<typeof AnalysisKeywordMarkerTokenFilter>

export const AnalysisKeywordRepeatTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keyword_repeat')
}).meta({ id: 'AnalysisKeywordRepeatTokenFilter' })
export type AnalysisKeywordRepeatTokenFilter = z.infer<typeof AnalysisKeywordRepeatTokenFilter>

export const AnalysisKeywordTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('keyword'),
  buffer_size: integer.optional()
}).meta({ id: 'AnalysisKeywordTokenizer' })
export type AnalysisKeywordTokenizer = z.infer<typeof AnalysisKeywordTokenizer>

export const AnalysisKuromojiPartOfSpeechTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kuromoji_part_of_speech'),
  stoptags: z.array(z.string())
}).meta({ id: 'AnalysisKuromojiPartOfSpeechTokenFilter' })
export type AnalysisKuromojiPartOfSpeechTokenFilter = z.infer<typeof AnalysisKuromojiPartOfSpeechTokenFilter>

export const AnalysisKuromojiReadingFormTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kuromoji_readingform'),
  use_romaji: z.boolean()
}).meta({ id: 'AnalysisKuromojiReadingFormTokenFilter' })
export type AnalysisKuromojiReadingFormTokenFilter = z.infer<typeof AnalysisKuromojiReadingFormTokenFilter>

export const AnalysisKuromojiStemmerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kuromoji_stemmer'),
  minimum_length: integer
}).meta({ id: 'AnalysisKuromojiStemmerTokenFilter' })
export type AnalysisKuromojiStemmerTokenFilter = z.infer<typeof AnalysisKuromojiStemmerTokenFilter>

export const AnalysisKuromojiTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('kuromoji_tokenizer'),
  discard_punctuation: z.boolean().optional(),
  mode: AnalysisKuromojiTokenizationMode,
  nbest_cost: integer.optional(),
  nbest_examples: z.string().optional(),
  user_dictionary: z.string().optional(),
  user_dictionary_rules: z.array(z.string()).optional(),
  discard_compound_token: z.boolean().optional()
}).meta({ id: 'AnalysisKuromojiTokenizer' })
export type AnalysisKuromojiTokenizer = z.infer<typeof AnalysisKuromojiTokenizer>

export const AnalysisLengthTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('length'),
  max: integer.describe('Maximum character length of a token. Longer tokens are excluded from the output. Defaults to `Integer.MAX_VALUE`, which is `2^31-1` or `2147483647`.').optional(),
  min: integer.describe('Minimum character length of a token. Shorter tokens are excluded from the output. Defaults to `0`.').optional()
}).meta({ id: 'AnalysisLengthTokenFilter' })
export type AnalysisLengthTokenFilter = z.infer<typeof AnalysisLengthTokenFilter>

export const AnalysisLetterTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('letter')
}).meta({ id: 'AnalysisLetterTokenizer' })
export type AnalysisLetterTokenizer = z.infer<typeof AnalysisLetterTokenizer>

export const AnalysisLimitTokenCountTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('limit'),
  consume_all_tokens: z.boolean().describe('If `true`, the limit filter exhausts the token stream, even if the `max_token_count` has already been reached. Defaults to `false`.').optional(),
  max_token_count: SpecUtilsStringified.describe('Maximum number of tokens to keep. Once this limit is reached, any remaining tokens are excluded from the output. Defaults to `1`.').optional()
}).meta({ id: 'AnalysisLimitTokenCountTokenFilter' })
export type AnalysisLimitTokenCountTokenFilter = z.infer<typeof AnalysisLimitTokenCountTokenFilter>

export const AnalysisLowercaseNormalizer = z.object({
  type: z.literal('lowercase')
}).meta({ id: 'AnalysisLowercaseNormalizer' })
export type AnalysisLowercaseNormalizer = z.infer<typeof AnalysisLowercaseNormalizer>

export const AnalysisLowercaseTokenFilterLanguages = z.enum(['greek', 'irish', 'turkish']).meta({ id: 'AnalysisLowercaseTokenFilterLanguages' })
export type AnalysisLowercaseTokenFilterLanguages = z.infer<typeof AnalysisLowercaseTokenFilterLanguages>

export const AnalysisLowercaseTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('lowercase'),
  language: AnalysisLowercaseTokenFilterLanguages.describe('Language-specific lowercase token filter to use.').optional()
}).meta({ id: 'AnalysisLowercaseTokenFilter' })
export type AnalysisLowercaseTokenFilter = z.infer<typeof AnalysisLowercaseTokenFilter>

export const AnalysisLowercaseTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('lowercase')
}).meta({ id: 'AnalysisLowercaseTokenizer' })
export type AnalysisLowercaseTokenizer = z.infer<typeof AnalysisLowercaseTokenizer>

export const AnalysisMinHashTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('min_hash'),
  bucket_count: integer.describe('Number of buckets to which hashes are assigned. Defaults to `512`.').optional(),
  hash_count: integer.describe('Number of ways to hash each token in the stream. Defaults to `1`.').optional(),
  hash_set_size: integer.describe('Number of hashes to keep from each bucket. Defaults to `1`. Hashes are retained by ascending size, starting with the bucket’s smallest hash first.').optional(),
  with_rotation: z.boolean().describe('If `true`, the filter fills empty buckets with the value of the first non-empty bucket to its circular right if the `hash_set_size` is `1`. If the `bucket_count` argument is greater than 1, this parameter defaults to `true`. Otherwise, this parameter defaults to `false`.').optional()
}).meta({ id: 'AnalysisMinHashTokenFilter' })
export type AnalysisMinHashTokenFilter = z.infer<typeof AnalysisMinHashTokenFilter>

export const AnalysisMultiplexerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('multiplexer'),
  filters: z.array(z.string()).describe('A list of token filters to apply to incoming tokens.'),
  preserve_original: SpecUtilsStringified.describe('If `true` (the default) then emit the original token in addition to the filtered tokens.').optional()
}).meta({ id: 'AnalysisMultiplexerTokenFilter' })
export type AnalysisMultiplexerTokenFilter = z.infer<typeof AnalysisMultiplexerTokenFilter>

export const AnalysisNGramTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('ngram'),
  max_gram: integer.describe('Maximum length of characters in a gram. Defaults to `2`.').optional(),
  min_gram: integer.describe('Minimum length of characters in a gram. Defaults to `1`.').optional(),
  preserve_original: SpecUtilsStringified.describe('Emits original token when set to `true`. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisNGramTokenFilter' })
export type AnalysisNGramTokenFilter = z.infer<typeof AnalysisNGramTokenFilter>

export const AnalysisNGramTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('ngram'),
  custom_token_chars: z.string().optional(),
  max_gram: integer.optional(),
  min_gram: integer.optional(),
  token_chars: z.array(AnalysisTokenChar).optional()
}).meta({ id: 'AnalysisNGramTokenizer' })
export type AnalysisNGramTokenizer = z.infer<typeof AnalysisNGramTokenizer>

export const AnalysisNoriPartOfSpeechTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('nori_part_of_speech'),
  stoptags: z.array(z.string()).describe('An array of part-of-speech tags that should be removed.').optional()
}).meta({ id: 'AnalysisNoriPartOfSpeechTokenFilter' })
export type AnalysisNoriPartOfSpeechTokenFilter = z.infer<typeof AnalysisNoriPartOfSpeechTokenFilter>

export const AnalysisNoriTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('nori_tokenizer'),
  decompound_mode: AnalysisNoriDecompoundMode.optional(),
  discard_punctuation: z.boolean().optional(),
  user_dictionary: z.string().optional(),
  user_dictionary_rules: z.array(z.string()).optional()
}).meta({ id: 'AnalysisNoriTokenizer' })
export type AnalysisNoriTokenizer = z.infer<typeof AnalysisNoriTokenizer>

export const AnalysisNormalizer = z.union([AnalysisLowercaseNormalizer, AnalysisCustomNormalizer]).meta({ id: 'AnalysisNormalizer' })
export type AnalysisNormalizer = z.infer<typeof AnalysisNormalizer>

export const AnalysisPathHierarchyTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('path_hierarchy'),
  buffer_size: SpecUtilsStringified.optional(),
  delimiter: z.string().optional(),
  replacement: z.string().optional(),
  reverse: SpecUtilsStringified.optional(),
  skip: SpecUtilsStringified.optional()
}).meta({ id: 'AnalysisPathHierarchyTokenizer' })
export type AnalysisPathHierarchyTokenizer = z.infer<typeof AnalysisPathHierarchyTokenizer>

export const AnalysisPatternCaptureTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('pattern_capture'),
  patterns: z.array(z.string()).describe('A list of regular expressions to match.'),
  preserve_original: SpecUtilsStringified.describe('If set to `true` (the default) it will emit the original token.').optional()
}).meta({ id: 'AnalysisPatternCaptureTokenFilter' })
export type AnalysisPatternCaptureTokenFilter = z.infer<typeof AnalysisPatternCaptureTokenFilter>

export const AnalysisPatternReplaceTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('pattern_replace'),
  all: z.boolean().describe('If `true`, all substrings matching the pattern parameter’s regular expression are replaced. If `false`, the filter replaces only the first matching substring in each token. Defaults to `true`.').optional(),
  flags: z.string().optional(),
  pattern: z.string().describe('Regular expression, written in Java’s regular expression syntax. The filter replaces token substrings matching this pattern with the substring in the `replacement` parameter.'),
  replacement: z.string().describe('Replacement substring. Defaults to an empty substring (`""`).').optional()
}).meta({ id: 'AnalysisPatternReplaceTokenFilter' })
export type AnalysisPatternReplaceTokenFilter = z.infer<typeof AnalysisPatternReplaceTokenFilter>

export const AnalysisPatternTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('pattern'),
  flags: z.string().optional(),
  group: integer.optional(),
  pattern: z.string().optional()
}).meta({ id: 'AnalysisPatternTokenizer' })
export type AnalysisPatternTokenizer = z.infer<typeof AnalysisPatternTokenizer>

export const AnalysisPersianNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('persian_normalization')
}).meta({ id: 'AnalysisPersianNormalizationTokenFilter' })
export type AnalysisPersianNormalizationTokenFilter = z.infer<typeof AnalysisPersianNormalizationTokenFilter>

export const AnalysisPersianStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('persian_stem')
}).meta({ id: 'AnalysisPersianStemTokenFilter' })
export type AnalysisPersianStemTokenFilter = z.infer<typeof AnalysisPersianStemTokenFilter>

export const AnalysisPhoneticEncoder = z.enum(['metaphone', 'double_metaphone', 'soundex', 'refined_soundex', 'caverphone1', 'caverphone2', 'cologne', 'nysiis', 'koelnerphonetik', 'haasephonetik', 'beider_morse', 'daitch_mokotoff']).meta({ id: 'AnalysisPhoneticEncoder' })
export type AnalysisPhoneticEncoder = z.infer<typeof AnalysisPhoneticEncoder>

export const AnalysisPhoneticLanguage = z.enum(['any', 'common', 'cyrillic', 'english', 'french', 'german', 'hebrew', 'hungarian', 'polish', 'romanian', 'russian', 'spanish']).meta({ id: 'AnalysisPhoneticLanguage' })
export type AnalysisPhoneticLanguage = z.infer<typeof AnalysisPhoneticLanguage>

export const AnalysisPhoneticNameType = z.enum(['generic', 'ashkenazi', 'sephardic']).meta({ id: 'AnalysisPhoneticNameType' })
export type AnalysisPhoneticNameType = z.infer<typeof AnalysisPhoneticNameType>

export const AnalysisPhoneticRuleType = z.enum(['approx', 'exact']).meta({ id: 'AnalysisPhoneticRuleType' })
export type AnalysisPhoneticRuleType = z.infer<typeof AnalysisPhoneticRuleType>

export const AnalysisPhoneticTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('phonetic'),
  encoder: AnalysisPhoneticEncoder,
  languageset: z.union([AnalysisPhoneticLanguage, z.array(AnalysisPhoneticLanguage)]).optional(),
  max_code_len: integer.optional(),
  name_type: AnalysisPhoneticNameType.optional(),
  replace: z.boolean().optional(),
  rule_type: AnalysisPhoneticRuleType.optional()
}).meta({ id: 'AnalysisPhoneticTokenFilter' })
export type AnalysisPhoneticTokenFilter = z.infer<typeof AnalysisPhoneticTokenFilter>

export const AnalysisPorterStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('porter_stem')
}).meta({ id: 'AnalysisPorterStemTokenFilter' })
export type AnalysisPorterStemTokenFilter = z.infer<typeof AnalysisPorterStemTokenFilter>

export const AnalysisPredicateTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('predicate_token_filter'),
  script: z.lazy(() => Script).describe('Script containing a condition used to filter incoming tokens. Only tokens that match this script are included in the output.')
}).meta({ id: 'AnalysisPredicateTokenFilter' })
export type AnalysisPredicateTokenFilter = z.infer<typeof AnalysisPredicateTokenFilter>

export const AnalysisRemoveDuplicatesTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('remove_duplicates')
}).meta({ id: 'AnalysisRemoveDuplicatesTokenFilter' })
export type AnalysisRemoveDuplicatesTokenFilter = z.infer<typeof AnalysisRemoveDuplicatesTokenFilter>

export const AnalysisReverseTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('reverse')
}).meta({ id: 'AnalysisReverseTokenFilter' })
export type AnalysisReverseTokenFilter = z.infer<typeof AnalysisReverseTokenFilter>

export const AnalysisRussianStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('russian_stem')
}).meta({ id: 'AnalysisRussianStemTokenFilter' })
export type AnalysisRussianStemTokenFilter = z.infer<typeof AnalysisRussianStemTokenFilter>

export const AnalysisScandinavianFoldingTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('scandinavian_folding')
}).meta({ id: 'AnalysisScandinavianFoldingTokenFilter' })
export type AnalysisScandinavianFoldingTokenFilter = z.infer<typeof AnalysisScandinavianFoldingTokenFilter>

export const AnalysisScandinavianNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('scandinavian_normalization')
}).meta({ id: 'AnalysisScandinavianNormalizationTokenFilter' })
export type AnalysisScandinavianNormalizationTokenFilter = z.infer<typeof AnalysisScandinavianNormalizationTokenFilter>

export const AnalysisSerbianNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('serbian_normalization')
}).meta({ id: 'AnalysisSerbianNormalizationTokenFilter' })
export type AnalysisSerbianNormalizationTokenFilter = z.infer<typeof AnalysisSerbianNormalizationTokenFilter>

export const AnalysisShingleTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('shingle'),
  filler_token: z.string().describe('String used in shingles as a replacement for empty positions that do not contain a token. This filler token is only used in shingles, not original unigrams. Defaults to an underscore (`_`).').optional(),
  max_shingle_size: SpecUtilsStringified.describe('Maximum number of tokens to concatenate when creating shingles. Defaults to `2`.').optional(),
  min_shingle_size: SpecUtilsStringified.describe('Minimum number of tokens to concatenate when creating shingles. Defaults to `2`.').optional(),
  output_unigrams: z.boolean().describe('If `true`, the output includes the original input tokens. If `false`, the output only includes shingles; the original input tokens are removed. Defaults to `true`.').optional(),
  output_unigrams_if_no_shingles: z.boolean().describe('If `true`, the output includes the original input tokens only if no shingles are produced; if shingles are produced, the output only includes shingles. Defaults to `false`.').optional(),
  token_separator: z.string().describe('Separator used to concatenate adjacent tokens to form a shingle. Defaults to a space (`" "`).').optional()
}).meta({ id: 'AnalysisShingleTokenFilter' })
export type AnalysisShingleTokenFilter = z.infer<typeof AnalysisShingleTokenFilter>

export const AnalysisSimplePatternSplitTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('simple_pattern_split'),
  pattern: z.string().optional()
}).meta({ id: 'AnalysisSimplePatternSplitTokenizer' })
export type AnalysisSimplePatternSplitTokenizer = z.infer<typeof AnalysisSimplePatternSplitTokenizer>

export const AnalysisSimplePatternTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('simple_pattern'),
  pattern: z.string().optional()
}).meta({ id: 'AnalysisSimplePatternTokenizer' })
export type AnalysisSimplePatternTokenizer = z.infer<typeof AnalysisSimplePatternTokenizer>

export const AnalysisSnowballTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('snowball'),
  language: AnalysisSnowballLanguage.describe('Controls the language used by the stemmer.').optional()
}).meta({ id: 'AnalysisSnowballTokenFilter' })
export type AnalysisSnowballTokenFilter = z.infer<typeof AnalysisSnowballTokenFilter>

export const AnalysisSoraniNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('sorani_normalization')
}).meta({ id: 'AnalysisSoraniNormalizationTokenFilter' })
export type AnalysisSoraniNormalizationTokenFilter = z.infer<typeof AnalysisSoraniNormalizationTokenFilter>

export const AnalysisStandardTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('standard'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisStandardTokenizer' })
export type AnalysisStandardTokenizer = z.infer<typeof AnalysisStandardTokenizer>

export const AnalysisStemmerOverrideTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('stemmer_override'),
  rules: z.array(z.string()).describe('A list of mapping rules to use.').optional(),
  rules_path: z.string().describe('A path (either relative to `config` location, or absolute) to a list of mappings.').optional()
}).meta({ id: 'AnalysisStemmerOverrideTokenFilter' })
export type AnalysisStemmerOverrideTokenFilter = z.infer<typeof AnalysisStemmerOverrideTokenFilter>

export const AnalysisStemmerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('stemmer'),
  language: z.string().optional(),
  name: z.string().optional()
}).meta({ id: 'AnalysisStemmerTokenFilter' })
export type AnalysisStemmerTokenFilter = z.infer<typeof AnalysisStemmerTokenFilter>

export const AnalysisStopTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('stop'),
  ignore_case: z.boolean().describe('If `true`, stop word matching is case insensitive. For example, if `true`, a stop word of the matches and removes `The`, `THE`, or `the`. Defaults to `false`.').optional(),
  remove_trailing: z.boolean().describe('If `true`, the last token of a stream is removed if it’s a stop word. Defaults to `true`.').optional(),
  stopwords: z.lazy(() => AnalysisStopWords).describe('Language value, such as `_arabic_` or `_thai_`. Defaults to `_english_`.').optional(),
  stopwords_path: z.string().describe('Path to a file that contains a list of stop words to remove. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each stop word in the file must be separated by a line break.').optional()
}).meta({ id: 'AnalysisStopTokenFilter' })
export type AnalysisStopTokenFilter = z.infer<typeof AnalysisStopTokenFilter>

export const AnalysisSynonymFormat = z.enum(['solr', 'wordnet']).meta({ id: 'AnalysisSynonymFormat' })
export type AnalysisSynonymFormat = z.infer<typeof AnalysisSynonymFormat>

export const AnalysisSynonymTokenFilterBase = z.object({
  ...AnalysisTokenFilterBase.shape,
  expand: z.boolean().describe('Expands definitions for equivalent synonym rules. Defaults to `true`.').optional(),
  format: AnalysisSynonymFormat.describe('Sets the synonym rules format.').optional(),
  lenient: z.boolean().describe('If `true` ignores errors while parsing the synonym rules. It is important to note that only those synonym rules which cannot get parsed are ignored. Defaults to the value of the `updateable` setting.').optional(),
  synonyms: z.array(z.string()).describe('Used to define inline synonyms.').optional(),
  synonyms_path: z.string().describe('Used to provide a synonym file. This path must be absolute or relative to the `config` location.').optional(),
  synonyms_set: z.string().describe('Provide a synonym set created via Synonyms Management APIs.').optional(),
  tokenizer: z.string().describe('Controls the tokenizers that will be used to tokenize the synonym, this parameter is for backwards compatibility for indices that created before 6.0.').optional(),
  updateable: z.boolean().describe('If `true` allows reloading search analyzers to pick up changes to synonym files. Only to be used for search analyzers. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisSynonymTokenFilterBase' })
export type AnalysisSynonymTokenFilterBase = z.infer<typeof AnalysisSynonymTokenFilterBase>

export const AnalysisSynonymGraphTokenFilter = z.object({
  ...AnalysisSynonymTokenFilterBase.shape,
  type: z.literal('synonym_graph')
}).meta({ id: 'AnalysisSynonymGraphTokenFilter' })
export type AnalysisSynonymGraphTokenFilter = z.infer<typeof AnalysisSynonymGraphTokenFilter>

export const AnalysisSynonymTokenFilter = z.object({
  ...AnalysisSynonymTokenFilterBase.shape,
  type: z.literal('synonym')
}).meta({ id: 'AnalysisSynonymTokenFilter' })
export type AnalysisSynonymTokenFilter = z.infer<typeof AnalysisSynonymTokenFilter>

export const AnalysisThaiTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('thai')
}).meta({ id: 'AnalysisThaiTokenizer' })
export type AnalysisThaiTokenizer = z.infer<typeof AnalysisThaiTokenizer>

export const AnalysisTrimTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('trim')
}).meta({ id: 'AnalysisTrimTokenFilter' })
export type AnalysisTrimTokenFilter = z.infer<typeof AnalysisTrimTokenFilter>

export const AnalysisTruncateTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('truncate'),
  length: integer.describe('Character limit for each token. Tokens exceeding this limit are truncated. Defaults to `10`.').optional()
}).meta({ id: 'AnalysisTruncateTokenFilter' })
export type AnalysisTruncateTokenFilter = z.infer<typeof AnalysisTruncateTokenFilter>

export const AnalysisUniqueTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('unique'),
  only_on_same_position: z.boolean().describe('If `true`, only remove duplicate tokens in the same position. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisUniqueTokenFilter' })
export type AnalysisUniqueTokenFilter = z.infer<typeof AnalysisUniqueTokenFilter>

export const AnalysisUppercaseTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('uppercase')
}).meta({ id: 'AnalysisUppercaseTokenFilter' })
export type AnalysisUppercaseTokenFilter = z.infer<typeof AnalysisUppercaseTokenFilter>

export const AnalysisWordDelimiterTokenFilterBase = z.object({
  ...AnalysisTokenFilterBase.shape,
  catenate_all: z.boolean().describe('If `true`, the filter produces catenated tokens for chains of alphanumeric characters separated by non-alphabetic delimiters. Defaults to `false`.').optional(),
  catenate_numbers: z.boolean().describe('If `true`, the filter produces catenated tokens for chains of numeric characters separated by non-alphabetic delimiters. Defaults to `false`.').optional(),
  catenate_words: z.boolean().describe('If `true`, the filter produces catenated tokens for chains of alphabetical characters separated by non-alphabetic delimiters. Defaults to `false`.').optional(),
  generate_number_parts: z.boolean().describe('If `true`, the filter includes tokens consisting of only numeric characters in the output. If `false`, the filter excludes these tokens from the output. Defaults to `true`.').optional(),
  generate_word_parts: z.boolean().describe('If `true`, the filter includes tokens consisting of only alphabetical characters in the output. If `false`, the filter excludes these tokens from the output. Defaults to `true`.').optional(),
  preserve_original: SpecUtilsStringified.describe('If `true`, the filter includes the original version of any split tokens in the output. This original version includes non-alphanumeric delimiters. Defaults to `false`.').optional(),
  protected_words: z.array(z.string()).describe('Array of tokens the filter won’t split.').optional(),
  protected_words_path: z.string().describe('Path to a file that contains a list of tokens the filter won’t split. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each token in the file must be separated by a line break.').optional(),
  split_on_case_change: z.boolean().describe('If `true`, the filter splits tokens at letter case transitions. For example: camelCase -> [ camel, Case ]. Defaults to `true`.').optional(),
  split_on_numerics: z.boolean().describe('If `true`, the filter splits tokens at letter-number transitions. For example: j2se -> [ j, 2, se ]. Defaults to `true`.').optional(),
  stem_english_possessive: z.boolean().describe('If `true`, the filter removes the English possessive (`\'s`) from the end of each token. For example: O\'Neil\'s -> [ O, Neil ]. Defaults to `true`.').optional(),
  type_table: z.array(z.string()).describe('Array of custom type mappings for characters. This allows you to map non-alphanumeric characters as numeric or alphanumeric to avoid splitting on those characters.').optional(),
  type_table_path: z.string().describe('Path to a file that contains custom type mappings for characters. This allows you to map non-alphanumeric characters as numeric or alphanumeric to avoid splitting on those characters.').optional()
}).meta({ id: 'AnalysisWordDelimiterTokenFilterBase' })
export type AnalysisWordDelimiterTokenFilterBase = z.infer<typeof AnalysisWordDelimiterTokenFilterBase>

export const AnalysisWordDelimiterGraphTokenFilter = z.object({
  ...AnalysisWordDelimiterTokenFilterBase.shape,
  type: z.literal('word_delimiter_graph'),
  adjust_offsets: z.boolean().describe('If `true`, the filter adjusts the offsets of split or catenated tokens to better reflect their actual position in the token stream. Defaults to `true`.').optional(),
  ignore_keywords: z.boolean().describe('If `true`, the filter skips tokens with a keyword attribute of true. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisWordDelimiterGraphTokenFilter' })
export type AnalysisWordDelimiterGraphTokenFilter = z.infer<typeof AnalysisWordDelimiterGraphTokenFilter>

export const AnalysisWordDelimiterTokenFilter = z.object({
  ...AnalysisWordDelimiterTokenFilterBase.shape,
  type: z.literal('word_delimiter')
}).meta({ id: 'AnalysisWordDelimiterTokenFilter' })
export type AnalysisWordDelimiterTokenFilter = z.infer<typeof AnalysisWordDelimiterTokenFilter>

export const AnalysisTokenFilterDefinition = z.union([AnalysisApostropheTokenFilter, AnalysisArabicStemTokenFilter, AnalysisArabicNormalizationTokenFilter, AnalysisAsciiFoldingTokenFilter, AnalysisBengaliNormalizationTokenFilter, AnalysisBrazilianStemTokenFilter, AnalysisCjkBigramTokenFilter, AnalysisCjkWidthTokenFilter, AnalysisClassicTokenFilter, AnalysisCommonGramsTokenFilter, AnalysisConditionTokenFilter, AnalysisCzechStemTokenFilter, AnalysisDecimalDigitTokenFilter, AnalysisDelimitedPayloadTokenFilter, AnalysisDutchStemTokenFilter, AnalysisEdgeNGramTokenFilter, AnalysisElisionTokenFilter, AnalysisFingerprintTokenFilter, AnalysisFlattenGraphTokenFilter, AnalysisFrenchStemTokenFilter, AnalysisGermanNormalizationTokenFilter, AnalysisGermanStemTokenFilter, AnalysisHindiNormalizationTokenFilter, AnalysisHunspellTokenFilter, AnalysisHyphenationDecompounderTokenFilter, AnalysisIndicNormalizationTokenFilter, AnalysisKeepTypesTokenFilter, AnalysisKeepWordsTokenFilter, AnalysisKeywordMarkerTokenFilter, AnalysisKeywordRepeatTokenFilter, AnalysisKStemTokenFilter, AnalysisLengthTokenFilter, AnalysisLimitTokenCountTokenFilter, AnalysisLowercaseTokenFilter, AnalysisMinHashTokenFilter, AnalysisMultiplexerTokenFilter, AnalysisNGramTokenFilter, AnalysisNoriPartOfSpeechTokenFilter, AnalysisPatternCaptureTokenFilter, AnalysisPatternReplaceTokenFilter, AnalysisPersianNormalizationTokenFilter, AnalysisPersianStemTokenFilter, AnalysisPorterStemTokenFilter, AnalysisPredicateTokenFilter, AnalysisRemoveDuplicatesTokenFilter, AnalysisReverseTokenFilter, AnalysisRussianStemTokenFilter, AnalysisScandinavianFoldingTokenFilter, AnalysisScandinavianNormalizationTokenFilter, AnalysisSerbianNormalizationTokenFilter, AnalysisShingleTokenFilter, AnalysisSnowballTokenFilter, AnalysisSoraniNormalizationTokenFilter, AnalysisStemmerOverrideTokenFilter, AnalysisStemmerTokenFilter, AnalysisStopTokenFilter, AnalysisSynonymGraphTokenFilter, AnalysisSynonymTokenFilter, AnalysisTrimTokenFilter, AnalysisTruncateTokenFilter, AnalysisUniqueTokenFilter, AnalysisUppercaseTokenFilter, AnalysisWordDelimiterGraphTokenFilter, AnalysisWordDelimiterTokenFilter, AnalysisJaStopTokenFilter, AnalysisKuromojiStemmerTokenFilter, AnalysisKuromojiReadingFormTokenFilter, AnalysisKuromojiPartOfSpeechTokenFilter, AnalysisIcuCollationTokenFilter, AnalysisIcuFoldingTokenFilter, AnalysisIcuNormalizationTokenFilter, AnalysisIcuTransformTokenFilter, AnalysisPhoneticTokenFilter, AnalysisDictionaryDecompounderTokenFilter]).meta({ id: 'AnalysisTokenFilterDefinition' })
export type AnalysisTokenFilterDefinition = z.infer<typeof AnalysisTokenFilterDefinition>

export const AnalysisTokenFilter = z.union([z.string(), AnalysisTokenFilterDefinition]).meta({ id: 'AnalysisTokenFilter' })
export type AnalysisTokenFilter = z.infer<typeof AnalysisTokenFilter>

export const AnalysisUaxEmailUrlTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('uax_url_email'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisUaxEmailUrlTokenizer' })
export type AnalysisUaxEmailUrlTokenizer = z.infer<typeof AnalysisUaxEmailUrlTokenizer>

export const AnalysisWhitespaceTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('whitespace'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisWhitespaceTokenizer' })
export type AnalysisWhitespaceTokenizer = z.infer<typeof AnalysisWhitespaceTokenizer>

export const AnalysisTokenizerDefinition = z.union([AnalysisCharGroupTokenizer, AnalysisClassicTokenizer, AnalysisEdgeNGramTokenizer, AnalysisKeywordTokenizer, AnalysisLetterTokenizer, AnalysisLowercaseTokenizer, AnalysisNGramTokenizer, AnalysisPathHierarchyTokenizer, AnalysisPatternTokenizer, AnalysisSimplePatternTokenizer, AnalysisSimplePatternSplitTokenizer, AnalysisStandardTokenizer, AnalysisThaiTokenizer, AnalysisUaxEmailUrlTokenizer, AnalysisWhitespaceTokenizer, AnalysisIcuTokenizer, AnalysisKuromojiTokenizer, AnalysisNoriTokenizer]).meta({ id: 'AnalysisTokenizerDefinition' })
export type AnalysisTokenizerDefinition = z.infer<typeof AnalysisTokenizerDefinition>

export const AnalysisTokenizer = z.union([z.string(), AnalysisTokenizerDefinition]).meta({ id: 'AnalysisTokenizer' })
export type AnalysisTokenizer = z.infer<typeof AnalysisTokenizer>
