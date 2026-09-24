/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Catalog } from '@kbn/a2ui-renderer';
import catalogSchema from '../catalog.json';
import { Card, Column, Divider, Row, Tabs } from './components/layout';
import { Badge, Callout, Icon, Stat, Table, Text } from './components/display';
import {
  Accordion,
  DescriptionList,
  Flyout,
  Health,
  Link,
  Modal,
  Popover,
  Progress,
} from './components/feedback';
import {
  Button,
  CheckBox,
  ChoicePicker,
  DateTimeInput,
  Slider,
  TextField,
} from './components/inputs';
import { FilterGroup, MultiSelectFilter, ToggleGroup } from './components/filters';
import { euiCatalogFunctions } from './functions';

export const EUI_CATALOG_ID = 'elastic/kibana-eui/v1';

const components = [
  Column,
  Row,
  Card,
  Tabs,
  Divider,
  Text,
  Icon,
  Badge,
  Stat,
  Callout,
  Table,
  Button,
  TextField,
  CheckBox,
  ChoicePicker,
  Slider,
  DateTimeInput,
  FilterGroup,
  MultiSelectFilter,
  ToggleGroup,
  Modal,
  Flyout,
  Popover,
  Accordion,
  Health,
  Link,
  DescriptionList,
  Progress,
];

export const euiCatalog: Catalog = {
  id: EUI_CATALOG_ID,
  components: Object.fromEntries(components.map((component) => [component.name, component])),
  functions: euiCatalogFunctions,
};

/**
 * The catalog JSON Schema. This is what gets handed to the agent as its
 * contract, and what server-side validation checks generated documents against.
 */
export const euiCatalogSchema = catalogSchema;
