/*
 * Licensed to ElasticSearch under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. ElasticSearch licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
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

package org.elasticsearch.marvel.monitor;

import org.elasticsearch.Version;
import org.elasticsearch.common.collect.ImmutableList;
import org.elasticsearch.common.component.LifecycleComponent;
import org.elasticsearch.common.inject.AbstractModule;
import org.elasticsearch.common.inject.Module;
import org.elasticsearch.common.logging.ESLogger;
import org.elasticsearch.common.logging.Loggers;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.plugins.AbstractPlugin;

import java.util.ArrayList;
import java.util.Collection;

public class Plugin extends AbstractPlugin {

    final ESLogger logger = Loggers.getLogger(getClass());

    // copied here because we can't depend on it available
    public static final int V_0_90_8_ID = /*00*/900899;

    public final boolean enabled;

    public Plugin() {
        if (Version.CURRENT.id < V_0_90_8_ID) {
            logger.warn("Elasticsearch version [{}] is too old. Marvel is disabled (requires version 0.90.8 or higher)", Version.CURRENT);
            enabled = false;
        } else {
            enabled = true;
        }
    }

    @Override
    public String name() {
        return "marvel";
    }

    @Override
    public String description() {
        return "Elasticsearch Management & Monitoring";
    }

    @Override
    public Collection<Module> modules(Settings settings) {
        if (!enabled) {
            return ImmutableList.of();
        }
        Module m = new AbstractModule() {

            @Override
            protected void configure() {
                bind(ExportersService.class).asEagerSingleton();
            }
        };
        return ImmutableList.of(m);
    }

    @Override
    public Collection<Class<? extends LifecycleComponent>> services() {
        Collection<Class<? extends LifecycleComponent>> l = new ArrayList<Class<? extends LifecycleComponent>>();
        if (enabled) {
            l.add(ExportersService.class);
        }
        return l;
    }
}
