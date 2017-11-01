import { mergeType } from './merge_type';

export const merge = mergeType((a, b) => ({
  ...a,
  ...b
}));
