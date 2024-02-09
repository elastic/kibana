/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from "react";
import { OpenAIKeyCallout } from "./open_ai_key_callout";

import { OpenAIKeyFlyOut } from "./open_ai_key_flyout";

interface OpenAIKeyProps {
  apiKey: string;
  onSave: () => void;
}

export const OpenAIKey: React.FC<OpenAIKeyProps> = ({ apiKey, onSave }) => {
  const [isOpenAIFlyOutOpen, setIsOpenAIFlyOutOpen] = useState<boolean>(false);

  const onCloseOpenAIFlyOut = () => {
    setIsOpenAIFlyOutOpen(!isOpenAIFlyOutOpen);
  };

  return (
    <>
      {isOpenAIFlyOutOpen && <OpenAIKeyFlyOut openAPIKey={apiKey} onSave={onSave} onClose={onCloseOpenAIFlyOut} />}
      <OpenAIKeyCallout setIsOpenAIFlyOutOpen={setIsOpenAIFlyOutOpen} />
    </>
  );
}
