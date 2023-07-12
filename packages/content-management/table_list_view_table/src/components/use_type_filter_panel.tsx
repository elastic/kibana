/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export interface TypeFilterPanelProps {
  onSearch: (value: string[]) => void;
}

export interface ItemProps {
  label: string;
  checked: boolean;
  values: string[];
}

export type SelectedTypeProps = Omit<ItemProps, 'checked'>;

export const TYPE_COMPRESSED = i18n.translate('xpack.cases.caseView.files.compressedMimeType', {
  defaultMessage: 'Compressed',
});

export const TYPE_IMAGE = i18n.translate('xpack.cases.caseView.files.imageMimeType', {
  defaultMessage: 'Image',
});

export const TYPE_PDF = i18n.translate('xpack.cases.caseView.files.pdfMimeType', {
  defaultMessage: 'PDF',
});

export const TYPE_TEXT = i18n.translate('xpack.cases.caseView.files.textMimeType', {
  defaultMessage: 'Text',
});

/**
 * These were retrieved from https://www.iana.org/assignments/media-types/media-types.xhtml#image
 */
export const imageMimeTypes = [
  'image/aces',
  'image/apng',
  'image/avci',
  'image/avcs',
  'image/avif',
  'image/bmp',
  'image/cgm',
  'image/dicom-rle',
  'image/dpx',
  'image/emf',
  'image/example',
  'image/fits',
  'image/g3fax',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/hej2k',
  'image/hsj2',
  'image/jls',
  'image/jp2',
  'image/jpeg',
  'image/jph',
  'image/jphc',
  'image/jpm',
  'image/jpx',
  'image/jxr',
  'image/jxrA',
  'image/jxrS',
  'image/jxs',
  'image/jxsc',
  'image/jxsi',
  'image/jxss',
  'image/ktx',
  'image/ktx2',
  'image/naplps',
  'image/png',
  'image/prs.btif',
  'image/prs.pti',
  'image/pwg-raster',
  'image/svg+xml',
  'image/t38',
  'image/tiff',
  'image/tiff-fx',
  'image/vnd.adobe.photoshop',
  'image/vnd.airzip.accelerator.azv',
  'image/vnd.cns.inf2',
  'image/vnd.dece.graphic',
  'image/vnd.djvu',
  'image/vnd.dwg',
  'image/vnd.dxf',
  'image/vnd.dvb.subtitle',
  'image/vnd.fastbidsheet',
  'image/vnd.fpx',
  'image/vnd.fst',
  'image/vnd.fujixerox.edmics-mmr',
  'image/vnd.fujixerox.edmics-rlc',
  'image/vnd.globalgraphics.pgb',
  'image/vnd.microsoft.icon',
  'image/vnd.mix',
  'image/vnd.ms-modi',
  'image/vnd.mozilla.apng',
  'image/vnd.net-fpx',
  'image/vnd.pco.b16',
  'image/vnd.radiance',
  'image/vnd.sealed.png',
  'image/vnd.sealedmedia.softseal.gif',
  'image/vnd.sealedmedia.softseal.jpg',
  'image/vnd.svf',
  'image/vnd.tencent.tap',
  'image/vnd.valve.source.texture',
  'image/vnd.wap.wbmp',
  'image/vnd.xiff',
  'image/vnd.zbrush.pcx',
  'image/webp',
  'image/wmf',
];

export const textMimeTypes = ['text/plain', 'text/csv', 'text/json', 'application/json'];

export const compressionMimeTypes = [
  'application/zip',
  'application/gzip',
  'application/x-bzip',
  'application/x-bzip2',
  'application/x-7z-compressed',
  'application/x-tar',
];

export const pdfMimeTypes = ['application/pdf'];
