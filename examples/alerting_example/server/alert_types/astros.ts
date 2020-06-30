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

import axios from 'axios';
import { AlertType } from '../../../../x-pack/plugins/alerts/server';
import { Operator, Craft, ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

interface PeopleInSpace {
  people: Array<{
    craft: string;
    name: string;
  }>;
  number: number;
}

function getOperator(op: string) {
  switch (op) {
    case Operator.AreAbove:
      return (left: number, right: number) => left > right;
    case Operator.AreBelow:
      return (left: number, right: number) => left < right;
    case Operator.AreExactly:
      return (left: number, right: number) => left === right;
    default:
      return () => {
        throw new Error(
          `Invalid Operator "${op}" [${Operator.AreAbove},${Operator.AreBelow},${Operator.AreExactly}]`
        );
      };
  }
}

function getCraftFilter(craft: string) {
  return (person: { craft: string; name: string }) =>
    craft === Craft.OuterSpace ? true : craft === person.craft;
}

export const alertType: AlertType = {
  id: 'example.people-in-space',
  name: 'People In Space Right Now',
  actionGroups: [{ id: 'default', name: 'default' }],
  defaultActionGroupId: 'default',
  async executor({ services, params }) {
    const { outerSpaceCapacity, craft: craftToTriggerBy, op } = params;

    const response = await axios.get<PeopleInSpace>('http://api.open-notify.org/astros.json');
    const {
      data: { number: peopleInSpace, people = [] },
    } = response;

    const peopleInCraft = people.filter(getCraftFilter(craftToTriggerBy));

    if (getOperator(op)(peopleInCraft.length, outerSpaceCapacity)) {
      peopleInCraft.forEach(({ craft, name }) => {
        services.alertInstanceFactory(name).replaceState({ craft }).scheduleActions('default');
      });
    }

    return {
      peopleInSpace,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
