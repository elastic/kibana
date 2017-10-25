import { demodata } from './demodata/demodata';
import { demoprices } from './demoprices/demoprices';
import { escount } from './escount/escount';
import { esdocs } from './esdocs/esdocs';
import { kuler } from './kuler/kuler';
import { pointseries } from './pointseries/pointseries';
import { timelion } from './timelion/timelion';
import { toFn } from './to/to';

export const serverFunctions = [
  esdocs,
  escount,
  demodata,
  demoprices,
  pointseries,
  kuler,
  timelion,
  toFn,
];
