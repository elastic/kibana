import { get } from 'lodash';
import { isValid } from '../../common/lib/dataurl';
import { missingImage } from '../../common/lib/missing_asset';

export const resolveFromArgs = (args, defaultDataurl = null) => {
  const dataurl = get(args, 'dataurl.0', null);
  return isValid(dataurl) ? dataurl : defaultDataurl;
};

export const resolveWithMissingImage = (img, alt = null) => {
  if (isValid(img)) return img;
  if (img === null) return alt;
  return missingImage;
};
