---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/sample-data.html
---

# Installing sample data [sample-data]

There are a couple ways to easily get data ingested into {{es}}.


## Sample data packages available for one click installation [_sample_data_packages_available_for_one_click_installation]

The easiest is to install one or more of our available sample data packages. If you have no data, you should be prompted to install when running {{kib}} for the first time. You can also access and install the sample data packages by going to the **Integrations** page and selecting **Sample data**.


## makelogs script [_makelogs_script]

The provided `makelogs` script will generate sample data.

```bash
node scripts/makelogs --auth <username>:<password>
```

The default username and password combination are `elastic:changeme`

Make sure to execute `node scripts/makelogs` **after** {{es}} is up and running!


## CSV upload [_csv_upload]

You can also use the CSV uploader provided on the **Upload file** page available in the list of **Integrations**. Navigate to **Add data** > **Upload file** to upload your data from a file.
